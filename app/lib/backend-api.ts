import type { CatalogItem } from "@/lib/smg-storage";

/**
 * Trình duyệt gọi `/smg-api/...` (Next rewrite → backend) = cùng origin với trang → hết CORS, hết lỗi LAN/điện thoại gọi nhầm localhost.
 * Chỉ dùng URL tuyệt đối khi `NEXT_PUBLIC_BACKEND_URL` trỏ API public (không phải localhost).
 */
const SMG_API_PREFIX = "/smg-api";

function directPublicBackendUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return null;
  try {
    const u = new URL(raw);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return null;
    return raw.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function baseUrl(): string | null {
  const direct = directPublicBackendUrl();
  if (typeof window !== "undefined") {
    return direct ?? SMG_API_PREFIX;
  }
  return (
    process.env.BACKEND_INTERNAL_URL?.trim().replace(/\/$/, "") ||
    process.env.BACKEND_PROXY_TARGET?.trim().replace(/\/$/, "") ||
    "http://127.0.0.1:3001"
  );
}

export function isBackendConfigured(): boolean {
  return Boolean(baseUrl());
}

export type ReleaseTableRow = { field: string; value: string };

export type PushReleaseResponse = {
  ok: boolean;
  release?: CatalogItem;
  table?: ReleaseTableRow[];
  tableMatrix?: { headers: string[]; rows: string[][] };
  error?: string;
};

export async function pushCatalogItemToBackend(item: CatalogItem): Promise<PushReleaseResponse> {
  const base = baseUrl();
  if (!base) {
    return { ok: false, error: "Chưa cấu hình NEXT_PUBLIC_BACKEND_URL" };
  }
  try {
    const res = await fetch(`${base}/api/releases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const data = (await res.json().catch(() => ({}))) as {
      release?: CatalogItem;
      table?: ReleaseTableRow[];
      tableMatrix?: { headers: string[]; rows: string[][] };
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, error: data.error || res.statusText };
    }
    return {
      ok: true,
      release: data.release,
      table: data.table,
      tableMatrix: data.tableMatrix,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

/** Upload WAV/FLAC/MP3 hoặc ảnh bìa — trả URL https và bảng mô tả file */
export async function uploadReleaseAsset(
  kind: "audio" | "cover",
  file: File
): Promise<{ ok: boolean; url?: string; error?: string; table?: ReleaseTableRow[] }> {
  const base = baseUrl();
  if (!base) {
    return { ok: false, error: "Chưa cấu hình NEXT_PUBLIC_BACKEND_URL" };
  }
  const fd = new FormData();
  fd.append("file", file);
  const path = kind === "audio" ? "/api/uploads/audio" : "/api/uploads/cover";
  try {
    const res = await fetch(`${base}${path}`, { method: "POST", body: fd });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      url?: string;
      error?: string;
      table?: ReleaseTableRow[];
    };
    if (!res.ok || !data.ok) {
      const hint =
        res.status === 404
          ? "Backend trên cổng 3001 có vẻ là bản cũ (thiếu POST /api/uploads/*). Tắt hết process dùng cổng 3001 rồi chạy lại npm run dev:all."
          : undefined;
      return { ok: false, error: data.error || hint || res.statusText };
    }
    return { ok: true, url: data.url, table: data.table };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export async function postBulkReleasesToBackend(items: CatalogItem[]): Promise<{ ok: boolean; message: string }> {
  const base = baseUrl();
  if (!base) {
    return { ok: false, message: "Chưa cấu hình NEXT_PUBLIC_BACKEND_URL" };
  }
  try {
    const res = await fetch(`${base}/api/releases/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releases: items }),
    });
    const data = (await res.json().catch(() => ({}))) as { inserted?: number; updated?: number; error?: string };
    if (!res.ok) {
      return { ok: false, message: data.error || res.statusText };
    }
    return {
      ok: true,
      message: `Đã gửi: thêm ${data.inserted ?? 0}, cập nhật ${data.updated ?? 0}`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export async function fetchBackendHealth(): Promise<boolean> {
  const base = baseUrl();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export type BackendHealthPayload = {
  ok?: boolean;
  uploadApi?: boolean;
  acrIdentify?: boolean;
};

/** Health chi tiết (acrIdentify = backend đã cấu ACRCloud). */
export type AuthLoginResponse = {
  role: import("@/lib/smg-storage").AccountRole;
  displayName: string;
  login: string;
};

export type DemoAccountHint = {
  primaryLogin: string;
  aliases: string[];
  role: import("@/lib/smg-storage").AccountRole;
  label: string;
};

/** Đăng nhập demo — mật khẩu chỉ kiểm tra trên backend. */
export async function postAuthLogin(
  login: string,
  password: string
): Promise<{ ok: true; data: AuthLoginResponse } | { ok: false; error: string }> {
  const base = baseUrl();
  if (!base) {
    return {
      ok: false,
      error:
        "Chưa xác định được URL API. Thêm NEXT_PUBLIC_BACKEND_URL vào .env.local (ví dụ https://api.cua-ban.com).",
    };
  }
  try {
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      role?: AuthLoginResponse["role"];
      displayName?: string;
      login?: string;
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, error: data.error || "Đăng nhập thất bại." };
    }
    if (!data.role || !data.displayName || data.login == null) {
      return { ok: false, error: "Phản hồi đăng nhập không hợp lệ." };
    }
    return {
      ok: true,
      data: { role: data.role, displayName: data.displayName, login: data.login },
    };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    if (
      raw === "Failed to fetch" ||
      raw.includes("NetworkError") ||
      raw.toLowerCase().includes("network request failed")
    ) {
      return {
        ok: false,
        error: `Không kết nối được API (${base === SMG_API_PREFIX ? "proxy /smg-api → cổng 3001" : base}). Hãy bật backend rồi chạy lại «npm run dev:all» (hoặc «npm run dev --prefix backend»).`,
      };
    }
    return { ok: false, error: raw || "Lỗi mạng" };
  }
}

export async function fetchDemoAuthHints(): Promise<{
  accounts: DemoAccountHint[];
  note?: string;
} | null> {
  const base = baseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/auth/demo-hints`);
    if (!res.ok) return null;
    return (await res.json()) as { accounts: DemoAccountHint[]; note?: string };
  } catch {
    return null;
  }
}

/** Đồng bộ trạng thái + ghi chú QC với backend sau khi đổi local. */
export async function patchReleaseStatusOnBackend(
  id: string,
  status: import("@/lib/smg-storage").ReleaseStatus,
  qcFeedback: string | null
): Promise<boolean> {
  const base = baseUrl();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/api/releases/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, qcFeedback }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteReleaseOnBackend(id: string): Promise<boolean> {
  const base = baseUrl();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/api/releases/${encodeURIComponent(id)}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchBackendHealthPayload(): Promise<BackendHealthPayload | null> {
  const base = baseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/health`);
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as BackendHealthPayload;
    return { ...data, ok: data.ok !== false };
  } catch {
    return null;
  }
}

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

/** QC — gửi URL master tới backend, backend tải mẫu và gọi ACRCloud Identify. */
export async function postAcrIdentify(
  audioUrl: string,
  meta?: { releaseTitle?: string; releaseArtist?: string }
): Promise<{
  ok: boolean;
  summary?: AcrIdentifySummary;
  raw?: unknown;
  error?: string;
}> {
  const base = baseUrl();
  if (!base) {
    return { ok: false, error: "Không xác định được địa chỉ API (kiểm tra proxy /smg-api hoặc NEXT_PUBLIC_BACKEND_URL)." };
  }
  const url = String(audioUrl ?? "").trim();
  if (!/^https?:\/\//i.test(url)) {
    return {
      ok: false,
      error:
        "URL master phải là http(s) công khai để backend tải mẫu (blob: hoặc file chỉ-máy-bạn không dùng được). Hãy upload lên server hoặc dùng link HTTPS.",
    };
  }
  try {
    const res = await fetch(`${base}/api/qc/acr-identify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioUrl: url,
        releaseTitle: meta?.releaseTitle?.trim() || undefined,
        releaseArtist: meta?.releaseArtist?.trim() || undefined,
      }),
    });
    const text = await res.text();
    let data: { ok?: boolean; summary?: AcrIdentifySummary; raw?: unknown; error?: string } = {};
    try {
      data = text ? (JSON.parse(text) as typeof data) : {};
    } catch {
      return {
        ok: false,
        error: `Phản hồi không phải JSON (${res.status}). ${text.slice(0, 160)}`,
      };
    }
    if (!res.ok) {
      const hint =
        res.status === 502
          ? " Không kết nối được backend — chạy «npm run dev:all» hoặc API trên cổng đã cấu hình."
          : "";
      return { ok: false, error: (data.error || res.statusText) + hint };
    }
    return { ok: true, summary: data.summary, raw: data.raw };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export type BackendRelease = import("@/lib/smg-storage").CatalogItem;

export async function fetchBackendReleases(): Promise<BackendRelease[]> {
  const base = baseUrl();
  if (!base) return [];
  try {
    const res = await fetch(`${base}/api/releases`);
    if (!res.ok) return [];
    const data = (await res.json()) as { releases?: BackendRelease[] };
    return data.releases ?? [];
  } catch {
    return [];
  }
}

export async function postExportCisDdex(releaseId: string): Promise<{ ok: boolean; message: string; files?: { filename: string }[] }> {
  const base = baseUrl();
  if (!base) return { ok: false, message: "Chưa cấu hình NEXT_PUBLIC_BACKEND_URL" };
  try {
    const res = await fetch(`${base}/api/ddex/export-cis/${encodeURIComponent(releaseId)}`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; files?: { filename: string }[]; errors?: string[] };
    if (!res.ok) {
      return { ok: false, message: (data.errors ?? []).join("; ") || res.statusText };
    }
    const n = data.files?.length ?? 0;
    return { ok: true, message: `Đã tạo ${n} file ERN CIS`, files: data.files };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

/** Mở tải ZIP DDEX (CORS phải cho phép origin Next) */
export function getCisDdexZipUrl(releaseId: string): string | null {
  const base = baseUrl();
  if (!base) return null;
  return `${base}/api/ddex/export-cis/${encodeURIComponent(releaseId)}/zip`;
}

export async function triggerDdexBatch(): Promise<{ ok: boolean; message: string }> {
  const base = baseUrl();
  if (!base) {
    return { ok: false, message: "Chưa cấu hình NEXT_PUBLIC_BACKEND_URL" };
  }
  try {
    const res = await fetch(`${base}/api/ddex/run-batch`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      files?: unknown[];
      skipped?: { releaseId: string; reason: string }[];
      cisDelivery?: { pushed?: boolean }[];
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, message: data.error || res.statusText };
    }
    const n = Array.isArray(data.files) ? data.files.length : 0;
    const sk = data.skipped?.length
      ? ` — bỏ qua ${data.skipped.length} (thiếu metadata DDEX: ${data.skipped.map((s) => s.releaseId).join(", ")})`
      : "";
    const cd = Array.isArray(data.cisDelivery)
      ? ` — CIS API: ${data.cisDelivery.filter((x: { pushed?: boolean }) => x.pushed).length}/${data.cisDelivery.length} gọi OK`
      : "";
    return { ok: true, message: `Batch DDEX: đã xuất ${n} file XML${sk}${cd}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export type CisDeliveryResultRow = {
  storeKey: string;
  pushed: boolean;
  skipped?: boolean;
  httpStatus?: number;
  error?: string;
};

/** POST ERN lên từng CIS_DELIVERY_*_URL; finalize=true → sent_to_stores khi mọi endpoint bắt buộc OK */
export async function postCisDeliveryPush(
  releaseId: string,
  opts?: { finalize?: boolean; writeFiles?: boolean }
): Promise<{ ok: boolean; message: string; results?: CisDeliveryResultRow[]; finalized?: boolean }> {
  const base = baseUrl();
  if (!base) {
    return { ok: false, message: "Chưa cấu hình NEXT_PUBLIC_BACKEND_URL" };
  }
  const q = new URLSearchParams();
  if (opts?.finalize) q.set("finalize", "1");
  if (opts?.writeFiles === false) q.set("writeFiles", "0");
  const qs = q.toString();
  const url = `${base}/api/delivery/push/${encodeURIComponent(releaseId)}${qs ? `?${qs}` : ""}`;
  try {
    const res = await fetch(url, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      summary?: string;
      results?: CisDeliveryResultRow[];
      finalized?: boolean;
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, message: data.error || data.summary || res.statusText };
    }
    const pushed = data.results?.filter((r) => r.pushed) ?? [];
    const failed = data.results?.filter((r) => !r.pushed && !r.skipped) ?? [];
    const skipped = data.results?.filter((r) => r.skipped) ?? [];
    let message = data.ok
      ? `HTTP OK: ${pushed.map((r) => r.storeKey).join(", ") || "chưa cấu URL — chỉ lưu file"}`
      : data.summary || "Gửi thất bại";
    if (skipped.length) message += ` — bỏ qua (chưa cấu URL): ${skipped.map((r) => r.storeKey).join(", ")}`;
    if (data.finalized) message += " — đã chốt sent_to_stores.";
    if (failed.length) message += ` — lỗi: ${failed.map((f) => `${f.storeKey}: ${f.error ?? f.httpStatus}`).join("; ")}`;
    return {
      ok: Boolean(data.ok),
      message,
      results: data.results,
      finalized: data.finalized,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export async function fetchDeliveryStatus(): Promise<{
  cisAutoDelivery: boolean;
  sftpConfigured?: boolean;
  stores: { storeKey: string; hasEndpoint: boolean }[];
} | null> {
  const base = baseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/delivery/status`);
    if (!res.ok) return null;
    return (await res.json()) as {
      cisAutoDelivery: boolean;
      sftpConfigured?: boolean;
      stores: { storeKey: string; hasEndpoint: boolean }[];
    };
  } catch {
    return null;
  }
}
