import { createHmac } from "node:crypto";

const HTTP_URI = "/v1/identify";
const DATA_TYPE = "audio";
const SIGNATURE_VERSION = "1";

function acrMockEnabled(): boolean {
  const m = String(process.env.ACRCLOUD_MOCK ?? "").trim().toLowerCase();
  return m === "1" || m === "true" || m === "yes";
}

function hasAcrKeys(): boolean {
  const k = process.env.ACRCLOUD_ACCESS_KEY?.trim();
  const s = process.env.ACRCLOUD_ACCESS_SECRET?.trim();
  return Boolean(k && s);
}

/** Có key/secret thật, hoặc bật ACRCLOUD_MOCK để dev (UI QC vẫn hoạt động, không gọi API). */
export function isAcrConfigured(): boolean {
  if (hasAcrKeys()) return true;
  if (acrMockEnabled()) return true;
  return false;
}

function signRequest(accessKey: string, accessSecret: string, timestamp: string): string {
  const stringToSign = `POST\n${HTTP_URI}\n${accessKey}\n${DATA_TYPE}\n${SIGNATURE_VERSION}\n${timestamp}`;
  return createHmac("sha1", accessSecret).update(stringToSign).digest("base64");
}

function identifyHost(): string {
  return (process.env.ACRCLOUD_HOST || "identify-eu-west-1.acrcloud.com").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** ~15–20s MP3 128k — ACR khuyến nghị đoạn đầu rõ, đủ dài để fingerprint. */
const DEFAULT_MAX_BYTES = 2_400_000;

/** Tải một đoạn đầu file âm thanh từ URL (ACRCloud khuyến nghị &lt; ~15s, &lt; 5MB). */
export async function downloadAudioSample(audioUrl: string): Promise<{ buffer: Buffer; filename: string }> {
  const maxBytes = Number(process.env.ACRCLOUD_MAX_SAMPLE_BYTES);
  const cap = Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : DEFAULT_MAX_BYTES;
  const timeoutMs = Number(process.env.ACRCLOUD_DOWNLOAD_TIMEOUT_MS);
  const ms = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 45_000;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(audioUrl, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { Accept: "audio/*, application/octet-stream, */*" },
    });
    if (!res.ok) {
      throw new Error(`Không tải được audio (HTTP ${res.status})`);
    }
    const ab = await res.arrayBuffer();
    let buffer = Buffer.from(ab);
    if (buffer.length > cap) {
      buffer = buffer.subarray(0, cap);
    }
    if (buffer.length < 512) {
      throw new Error("File tải về quá nhỏ — có thể URL không trỏ tới audio hợp lệ.");
    }
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    let ext = "bin";
    if (ct.includes("wav")) ext = "wav";
    else if (ct.includes("mpeg") || ct.includes("mp3")) ext = "mp3";
    else if (ct.includes("mp4") || ct.includes("m4a")) ext = "m4a";
    else if (ct.includes("flac")) ext = "flac";
    else if (ct.includes("ogg")) ext = "ogg";
    return { buffer, filename: `qc_sample.${ext}` };
  } finally {
    clearTimeout(timer);
  }
}

export type AcrRawResponse = Record<string, unknown>;

export type AcrIdentifySummary = {
  matched: boolean;
  statusCode?: number;
  statusMsg?: string;
  title?: string;
  artists?: string[];
  album?: string;
  isrc?: string;
  upc?: string;
  acrScore?: number;
  playOffsetMs?: number;
  durationMs?: number;
  label?: string;
};

export function summarizeAcrResponse(raw: AcrRawResponse): AcrIdentifySummary {
  const status = raw.status as { code?: number; msg?: string } | undefined;
  const code = status?.code;
  const msg = status?.msg;
  const meta = raw.metadata as { music?: unknown[] } | undefined;
  const music = Array.isArray(meta?.music) ? meta!.music : [];
  if (music.length === 0) {
    return { matched: false, statusCode: code, statusMsg: msg };
  }
  const m = music[0] as Record<string, unknown>;
  let artists: string[] | undefined;
  if (Array.isArray(m.artists)) {
    artists = (m.artists as { name?: string }[]).map((a) => a.name).filter((x): x is string => Boolean(x?.trim()));
  }
  const ext = (m.external_ids as Record<string, string> | undefined) || {};
  return {
    matched: true,
    statusCode: code,
    statusMsg: msg,
    title: m.title != null ? String(m.title) : undefined,
    artists: artists?.length ? artists : undefined,
    album: m.album != null && typeof m.album === "object" && (m.album as { name?: string }).name
      ? String((m.album as { name: string }).name)
      : undefined,
    isrc: ext.isrc,
    upc: ext.upc,
    acrScore: typeof m.score === "number" ? m.score : undefined,
    playOffsetMs: typeof m.play_offset_ms === "number" ? m.play_offset_ms : undefined,
    durationMs: typeof m.duration_ms === "number" ? m.duration_ms : undefined,
    label: m.label != null ? String(m.label) : undefined,
  };
}

/** Gửi buffer tới ACRCloud Identify API v1. */
export async function identifyAudioBuffer(buffer: Buffer, filename: string): Promise<AcrRawResponse> {
  const accessKey = process.env.ACRCLOUD_ACCESS_KEY!.trim();
  const accessSecret = process.env.ACRCLOUD_ACCESS_SECRET!.trim();
  const host = identifyHost();
  const url = `https://${host}${HTTP_URI}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signRequest(accessKey, accessSecret, timestamp);

  const form = new FormData();
  form.append("sample", new Blob([new Uint8Array(buffer)]), filename);
  form.append("access_key", accessKey);
  form.append("sample_bytes", String(buffer.length));
  form.append("timestamp", timestamp);
  form.append("signature", signature);
  form.append("data_type", DATA_TYPE);
  form.append("signature_version", SIGNATURE_VERSION);

  const res = await fetch(url, { method: "POST", body: form });
  const text = await res.text();
  let json: AcrRawResponse;
  try {
    json = JSON.parse(text) as AcrRawResponse;
  } catch {
    throw new Error(`ACRCloud trả về không phải JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const errMsg = (json as { status?: { msg?: string } }).status?.msg || text.slice(0, 300);
    throw new Error(`ACRCloud HTTP ${res.status}: ${errMsg}`);
  }
  return json;
}

export type IdentifyFromUrlOptions = {
  /** Tiêu đề / nghệ sĩ từ form phát hành — chỉ dùng khi MOCK + ACRCLOUD_MOCK_SYNTHETIC_HIT. */
  releaseTitle?: string;
  releaseArtist?: string;
};

export async function identifyFromAudioUrl(
  audioUrl: string,
  opts?: IdentifyFromUrlOptions
): Promise<{ raw: AcrRawResponse; summary: AcrIdentifySummary }> {
  if (hasAcrKeys()) {
    const { buffer, filename } = await downloadAudioSample(audioUrl);
    const raw = await identifyAudioBuffer(buffer, filename);
    return { raw, summary: summarizeAcrResponse(raw) };
  }
  if (acrMockEnabled()) {
    const syn = String(process.env.ACRCLOUD_MOCK_SYNTHETIC_HIT ?? "").trim().toLowerCase();
    const wantSynthetic = syn === "1" || syn === "true" || syn === "yes";
    const t = opts?.releaseTitle?.trim();
    const a = opts?.releaseArtist?.trim();
    if (wantSynthetic && (t || a)) {
      const statusMsg =
        "MOCK + ACRCLOUD_MOCK_SYNTHETIC_HIT: giả lập khớp metadata form (không gọi ACRCloud). Để quét bản đã phát hành thật: tắt ACRCLOUD_MOCK, cấu hình ACRCLOUD_ACCESS_KEY/SECRET và ACRCLOUD_HOST đúng region dự án.";
      const raw = {
        status: { code: 0, msg: statusMsg },
        metadata: {
          music: [
            {
              title: t || "—",
              artists: a ? [{ name: a }] : [],
              score: 100,
            },
          ],
        },
      } as AcrRawResponse;
      return { raw, summary: summarizeAcrResponse(raw) };
    }
    const statusMsg =
      "ACRCLOUD_MOCK: không gọi ACRCloud — luôn «không khớp». Điền key thật và tắt MOCK để quét catalog thương mại; hoặc bật ACRCLOUD_MOCK_SYNTHETIC_HIT=1 để dev giả lập khớp theo tiêu đề/nghệ sĩ gửi kèm.";
    const raw = {
      status: { code: 0, msg: statusMsg },
      metadata: {},
    } as AcrRawResponse;
    return {
      raw,
      summary: { matched: false, statusCode: 0, statusMsg },
    };
  }
  throw new Error("Thiếu ACRCLOUD_ACCESS_KEY / ACRCLOUD_ACCESS_SECRET và ACRCLOUD_MOCK chưa bật.");
}
