/**
 * Gọi API báo cáo đối tác (server → server) — URL cấu hình bằng biến môi trường.
 * JSON mẫu hỗ trợ: { "byStore": [{ "storeName": "Zing MP3", "streams": 1200000 }] }
 * hoặc { "stores": [{ "name": "Spotify", "streamCount": 500 }] } — normalizer bên dưới.
 */

export type StoreStreamRow = {
  storeName: string;
  streams: number;
  storeKey?: string;
};

export type PartnerAnalyticsReport =
  | { configured: false; fetchOk: false; stores: []; error?: undefined; asOf?: undefined }
  | { configured: true; fetchOk: false; stores: []; error: string; asOf?: undefined }
  | { configured: true; fetchOk: true; stores: StoreStreamRow[]; asOf?: string };

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v.replace(/[,_\s]/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function extractAsOf(root: Record<string, unknown>): string | undefined {
  const v = pickString(root, ["asOf", "updatedAt", "generatedAt", "period", "snapshotAt"]);
  return v;
}

function normalizeStoresArray(arr: unknown[]): StoreStreamRow[] {
  const out: StoreStreamRow[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const storeName = pickString(r, ["storeName", "name", "label", "store", "dsp", "platform", "title", "storeLabel"]);
    const storeKey = pickString(r, ["storeKey", "key", "id", "code"]);
    const streams = pickNumber(r, ["streams", "streamCount", "plays", "totalStreams", "count", "stream_total", "qty"]);
    if (storeName && streams != null && streams >= 0) {
      out.push({ storeName, streams: Math.round(streams), storeKey });
    }
  }
  return out;
}

function normalizePartnerJson(body: unknown): StoreStreamRow[] {
  if (Array.isArray(body)) return normalizeStoresArray(body);
  if (!body || typeof body !== "object") return [];
  const o = body as Record<string, unknown>;
  const arrays = [o.byStore, o.stores, o.data, o.items, o.rows, o.platforms];
  for (const arr of arrays) {
    if (Array.isArray(arr)) {
      const rows = normalizeStoresArray(arr);
      if (rows.length > 0) return rows;
    }
  }
  return [];
}

function analyticsReportMockEnabled(): boolean {
  return ["1", "true", "yes"].includes(String(process.env.ANALYTICS_REPORT_MOCK ?? "").trim().toLowerCase());
}

export async function fetchPartnerAnalyticsReport(): Promise<PartnerAnalyticsReport> {
  if (analyticsReportMockEnabled()) {
    return {
      configured: true,
      fetchOk: true,
      stores: [
        { storeName: "Zing MP3", streams: 1_250_000, storeKey: "mock_zing" },
        { storeName: "Spotify", streams: 890_000, storeKey: "mock_spotify" },
        { storeName: "Apple Music", streams: 420_000, storeKey: "mock_apple" },
      ],
      asOf: new Date().toISOString(),
    };
  }

  const url = process.env.ANALYTICS_PARTNER_REPORT_URL?.trim();
  if (!url) {
    return { configured: false, fetchOk: false, stores: [] };
  }

  const timeoutMs = Math.min(Math.max(Number(process.env.ANALYTICS_PARTNER_TIMEOUT_MS ?? 20000) || 20000, 3000), 120000);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  const headers: Record<string, string> = { Accept: "application/json" };
  const bearer = process.env.ANALYTICS_PARTNER_BEARER?.trim();
  if (bearer) headers.Authorization = bearer.startsWith("Bearer ") ? bearer : `Bearer ${bearer}`;
  const authHeader = process.env.ANALYTICS_PARTNER_AUTH_HEADER?.trim();
  const authValue = process.env.ANALYTICS_PARTNER_AUTH_VALUE?.trim();
  if (authHeader && authValue) headers[authHeader] = authValue;

  const method = process.env.ANALYTICS_PARTNER_REPORT_METHOD?.trim().toUpperCase() === "POST" ? "POST" : "GET";

  try {
    const res = await fetch(url, { method, headers, signal: ac.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return {
        configured: true,
        fetchOk: false,
        stores: [],
        error: `Đối tác trả HTTP ${res.status}`,
      };
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return {
        configured: true,
        fetchOk: false,
        stores: [],
        error: "Phản hồi không phải JSON",
      };
    }
    const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const asOf = extractAsOf(root);
    const stores = normalizePartnerJson(body);
    return { configured: true, fetchOk: true, stores, asOf };
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? (e.name === "AbortError" ? "Hết thời gian chờ đối tác" : e.message) : "Lỗi gọi API";
    return {
      configured: true,
      fetchOk: false,
      stores: [],
      error: msg,
    };
  }
}
