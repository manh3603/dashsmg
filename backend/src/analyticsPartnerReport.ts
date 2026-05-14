/**
 * Gọi API báo cáo đối tác — URL từ env (ANALYTICS_PARTNER_REPORT_URL) và từng deal active (analyticsReportUrl).
 * JSON mẫu: { "byStore": [{ "storeName": "Zing MP3", "streams": 1200000 }] } …
 */

import { listDeals } from "./dealsStore.js";

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
  return pickString(root, ["asOf", "updatedAt", "generatedAt", "period", "snapshotAt"]);
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

type FetchSource = {
  label: string;
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
};

async function fetchOnePartnerJson(
  src: FetchSource,
  timeoutMs: number
): Promise<{ ok: true; stores: StoreStreamRow[]; asOf?: string } | { ok: false; error: string }> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(src.url, { method: src.method, headers: src.headers, signal: ac.signal });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `${src.label}: HTTP ${res.status}` };
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return { ok: false, error: `${src.label}: không phải JSON` };
    }
    const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const asOf = extractAsOf(root);
    const stores = normalizePartnerJson(body);
    return { ok: true, stores, asOf };
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? (e.name === "AbortError" ? "hết thời gian chờ" : e.message) : "lỗi gọi API";
    return { ok: false, error: `${src.label}: ${msg}` };
  }
}

function mergeStoreRows(rows: StoreStreamRow[]): StoreStreamRow[] {
  const map = new Map<string, StoreStreamRow>();
  for (const r of rows) {
    const key = `${(r.storeKey ?? "").toLowerCase()}|${r.storeName.trim().toLowerCase()}`;
    const prev = map.get(key);
    if (!prev) map.set(key, { ...r });
    else map.set(key, { ...prev, streams: prev.streams + r.streams });
  }
  return [...map.values()].sort((a, b) => b.streams - a.streams);
}

function buildAnalyticsSources(): FetchSource[] {
  const out: FetchSource[] = [];
  const envUrl = process.env.ANALYTICS_PARTNER_REPORT_URL?.trim();
  if (envUrl) {
    const headers: Record<string, string> = { Accept: "application/json" };
    const bearer = process.env.ANALYTICS_PARTNER_BEARER?.trim();
    if (bearer) headers.Authorization = bearer.startsWith("Bearer ") ? bearer : `Bearer ${bearer}`;
    const authHeader = process.env.ANALYTICS_PARTNER_AUTH_HEADER?.trim();
    const authValue = process.env.ANALYTICS_PARTNER_AUTH_VALUE?.trim();
    if (authHeader && authValue) headers[authHeader] = authValue;
    const method =
      process.env.ANALYTICS_PARTNER_REPORT_METHOD?.trim().toUpperCase() === "POST" ? "POST" : "GET";
    out.push({ label: "env", url: envUrl, method, headers });
  }

  for (const d of listDeals()) {
    if (d.status !== "active") continue;
    const u = d.analyticsReportUrl?.trim();
    if (!u) continue;
    const headers: Record<string, string> = { Accept: "application/json" };
    const b = d.analyticsReportBearer?.trim();
    if (b) headers.Authorization = b.startsWith("Bearer ") ? b : `Bearer ${b}`;
    const ah = d.analyticsReportAuthHeader?.trim();
    const av = d.analyticsReportAuthValue?.trim();
    if (ah && av) headers[ah] = av;
    const method = d.analyticsReportMethod?.trim().toUpperCase() === "POST" ? "POST" : "GET";
    out.push({ label: d.partnerName, url: u, method, headers });
  }

  return out;
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

  const sources = buildAnalyticsSources();
  if (!sources.length) {
    return { configured: false, fetchOk: false, stores: [] };
  }

  const timeoutMs = Math.min(Math.max(Number(process.env.ANALYTICS_PARTNER_TIMEOUT_MS ?? 20000) || 20000, 3000), 120000);
  const merged: StoreStreamRow[] = [];
  const errors: string[] = [];
  let latestAsOf: string | undefined;

  for (const src of sources) {
    const r = await fetchOnePartnerJson(src, timeoutMs);
    if (!r.ok) {
      errors.push(r.error);
      continue;
    }
    merged.push(...r.stores);
    if (r.asOf && (!latestAsOf || r.asOf > latestAsOf)) latestAsOf = r.asOf;
  }

  if (errors.length && merged.length === 0) {
    return {
      configured: true,
      fetchOk: false,
      stores: [],
      error: errors.join(" | "),
    };
  }

  return {
    configured: true,
    fetchOk: true,
    stores: mergeStoreRows(merged),
    asOf: latestAsOf ?? new Date().toISOString(),
  };
}
