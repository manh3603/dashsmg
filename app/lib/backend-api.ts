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
  /** Backend báo đã bật nối feed phân tích (ANALYTICS_FEED_ENABLED). */
  analyticsFeed?: boolean;
  /** Đã cấu hình URL báo cáo đối tác (ANALYTICS_PARTNER_REPORT_URL). */
  analyticsPartnerReport?: boolean;
  /** ANALYTICS_REPORT_MOCK=1 — backend trả stream mẫu. */
  analyticsReportMock?: boolean;
};

/** Health chi tiết (acrIdentify = backend đã cấu ACRCloud). */
export type AuthLoginResponse = {
  role: import("@/lib/smg-storage").AccountRole;
  displayName: string;
  login: string;
  /** Phiên Bearer cho API (ISRC, quản trị tài khoản…). */
  sessionToken?: string;
};

export type DemoAccountHint = {
  primaryLogin: string;
  aliases: string[];
  role: import("@/lib/smg-storage").AccountRole;
  label: string;
};

/** Đăng nhập — mật khẩu kiểm tra trên backend (tài khoản lưu file + tuỳ chọn DEMO_AUTH_*). */
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
      sessionToken?: string;
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
      data: {
        role: data.role,
        displayName: data.displayName,
        login: data.login,
        sessionToken: typeof data.sessionToken === "string" ? data.sessionToken : undefined,
      },
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

export async function postAuthLogout(sessionToken: string): Promise<void> {
  const base = baseUrl();
  if (!base || !sessionToken.trim()) return;
  try {
    await fetch(`${base}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionToken.trim()}` },
    });
  } catch {
    /* ignore */
  }
}

export async function postAuthRegister(body: {
  login: string;
  password: string;
  displayName: string;
  accountType: "artist" | "label";
  orgLabel?: string;
}): Promise<{ ok: true; data: AuthLoginResponse } | { ok: false; error: string }> {
  const base = baseUrl();
  if (!base) {
    return { ok: false, error: "Chưa xác định được URL API." };
  }
  try {
    const res = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      role?: AuthLoginResponse["role"];
      displayName?: string;
      login?: string;
      sessionToken?: string;
      error?: string;
    };
    if (!res.ok || !data.role || !data.displayName || data.login == null) {
      return { ok: false, error: data.error || "Đăng ký thất bại." };
    }
    return {
      ok: true,
      data: {
        role: data.role,
        displayName: data.displayName,
        login: data.login,
        sessionToken: typeof data.sessionToken === "string" ? data.sessionToken : undefined,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export type ServerStoredAccount = {
  id: string;
  login: string;
  role: import("@/lib/smg-storage").AccountRole;
  displayName: string;
  orgLabel?: string;
  royaltySharePercent?: number;
  createdAt: string;
  updatedAt: string;
};

export async function postAdminAccountList(
  sessionToken: string
): Promise<{ ok: true; accounts: ServerStoredAccount[] } | { ok: false; error: string }> {
  const base = baseUrl();
  if (!base) return { ok: false, error: "Chưa cấu hình API." };
  try {
    const res = await fetch(`${base}/api/admin/account-list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken.trim()}`,
      },
      body: JSON.stringify({}),
    });
    const data = (await res.json().catch(() => ({}))) as { accounts?: ServerStoredAccount[]; error?: string };
    if (!res.ok) return { ok: false, error: data.error || res.statusText };
    return { ok: true, accounts: data.accounts ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export async function postAdminAccountUpsert(
  sessionToken: string,
  user: {
    login: string;
    password?: string;
    displayName: string;
    role: import("@/lib/smg-storage").AccountRole;
    orgLabel?: string;
    royaltySharePercent?: number | null;
  }
): Promise<{ ok: true; accounts: ServerStoredAccount[] } | { ok: false; error: string }> {
  const base = baseUrl();
  if (!base) return { ok: false, error: "Chưa cấu hình API." };
  try {
    const res = await fetch(`${base}/api/admin/account-upsert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken.trim()}`,
      },
      body: JSON.stringify(user),
    });
    const data = (await res.json().catch(() => ({}))) as { accounts?: ServerStoredAccount[]; error?: string };
    if (!res.ok) return { ok: false, error: data.error || res.statusText };
    return { ok: true, accounts: data.accounts ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export async function postAdminAccountDelete(
  sessionToken: string,
  targetLogin: string
): Promise<{ ok: true; accounts: ServerStoredAccount[] } | { ok: false; error: string }> {
  const base = baseUrl();
  if (!base) return { ok: false, error: "Chưa cấu hình API." };
  try {
    const res = await fetch(`${base}/api/admin/account-delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken.trim()}`,
      },
      body: JSON.stringify({ targetLogin }),
    });
    const data = (await res.json().catch(() => ({}))) as { accounts?: ServerStoredAccount[]; error?: string };
    if (!res.ok) return { ok: false, error: data.error || res.statusText };
    return { ok: true, accounts: data.accounts ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export type PartnerDealRow = {
  id: string;
  partnerName: string;
  contractRef?: string;
  territory?: string;
  revenueTerms?: string;
  validFrom?: string;
  validTo?: string;
  contactEmail?: string;
  notes?: string;
  /** CSV cửa hàng / kênh báo cáo gắn deal — phục vụ phân tích đa nguồn. */
  reportingStores?: string;
  /** Cửa hàng CIS (id) giao DDEX — deal `active` được gộp với storesSelected khi gửi. */
  deliveryCisStoreKeys?: string[];
  /** JSON mảng SFTP (định dạng DDEX_SFTP_TARGETS) — merge khi deal `active`. */
  deliverySftpTargetsJson?: string;
  analyticsReportUrl?: string;
  analyticsReportMethod?: string;
  analyticsReportBearer?: string;
  analyticsReportAuthHeader?: string;
  analyticsReportAuthValue?: string;
  status: "draft" | "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type AnalyticsCisStoreRow = { storeKey: string; label: string; hasEndpoint: boolean };

export type AnalyticsDealRosterRow = {
  id: string;
  partnerName: string;
  status: PartnerDealRow["status"];
  territory: string | null;
  reportingStores: string[];
  hasDeliverySftp?: boolean;
  /** Cửa hàng CIS gắn deal (id) — xem Deal đối tác. */
  deliveryCisStoreKeys?: string[];
  hasAnalyticsReport?: boolean;
};

/** POST /api/analytics/context — đa deal + cửa hàng CIS (cần Bearer). */
export type AnalyticsContextPayload = {
  analyticsFeed: boolean;
  cisStores: AnalyticsCisStoreRow[];
  deals: AnalyticsDealRosterRow[];
  activeDealCount: number;
  activeReportingStoreTags: string[];
};

export type AnalyticsReportStoreRow = { storeName: string; streams: number; storeKey?: string };

export type AnalyticsReportPayload = {
  configured: boolean;
  fetchOk: boolean;
  stores: AnalyticsReportStoreRow[];
  asOf?: string;
  error?: string;
};

/** Stream theo cửa hàng — backend proxy tới ANALYTICS_PARTNER_REPORT_URL. */
export async function postAnalyticsReport(
  sessionToken: string
): Promise<{ ok: true; data: AnalyticsReportPayload } | { ok: false; error: string }> {
  const base = baseUrl();
  if (!base) return { ok: false, error: "Chưa cấu hình API." };
  try {
    const res = await fetch(`${base}/api/analytics/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken.trim()}`,
      },
      body: JSON.stringify({}),
    });
    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, error: (typeof raw.error === "string" ? raw.error : null) || res.statusText };
    if (raw.ok === false) return { ok: false, error: (typeof raw.error === "string" ? raw.error : null) || "Phản hồi không hợp lệ" };
    return {
      ok: true,
      data: {
        configured: Boolean(raw.configured),
        fetchOk: Boolean(raw.fetchOk),
        stores: Array.isArray(raw.stores) ? (raw.stores as AnalyticsReportStoreRow[]) : [],
        asOf: typeof raw.asOf === "string" ? raw.asOf : undefined,
        error: typeof raw.error === "string" ? raw.error : undefined,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export async function postAnalyticsContext(
  sessionToken: string
): Promise<{ ok: true; data: AnalyticsContextPayload } | { ok: false; error: string }> {
  const base = baseUrl();
  if (!base) return { ok: false, error: "Chưa cấu hình API." };
  try {
    const res = await fetch(`${base}/api/analytics/context`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken.trim()}`,
      },
      body: JSON.stringify({}),
    });
    const data = (await res.json().catch(() => ({}))) as AnalyticsContextPayload & { error?: string };
    if (!res.ok) return { ok: false, error: data.error || res.statusText };
    return {
      ok: true,
      data: {
        analyticsFeed: Boolean(data.analyticsFeed),
        cisStores: Array.isArray(data.cisStores) ? data.cisStores : [],
        deals: Array.isArray(data.deals) ? data.deals : [],
        activeDealCount: typeof data.activeDealCount === "number" ? data.activeDealCount : 0,
        activeReportingStoreTags: Array.isArray(data.activeReportingStoreTags) ? data.activeReportingStoreTags : [],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export async function postAdminDealsList(
  sessionToken: string
): Promise<{ ok: true; deals: PartnerDealRow[] } | { ok: false; error: string }> {
  const base = baseUrl();
  if (!base) return { ok: false, error: "Chưa cấu hình API." };
  try {
    const res = await fetch(`${base}/api/admin/deals/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken.trim()}`,
      },
      body: JSON.stringify({}),
    });
    const data = (await res.json().catch(() => ({}))) as { deals?: PartnerDealRow[]; error?: string };
    if (!res.ok) return { ok: false, error: data.error || res.statusText };
    return { ok: true, deals: data.deals ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export async function postAdminDealUpsert(
  sessionToken: string,
  deal: Partial<PartnerDealRow> & { partnerName: string }
): Promise<{ ok: true; deals: PartnerDealRow[] } | { ok: false; error: string }> {
  const base = baseUrl();
  if (!base) return { ok: false, error: "Chưa cấu hình API." };
  try {
    const res = await fetch(`${base}/api/admin/deals/upsert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken.trim()}`,
      },
      body: JSON.stringify(deal),
    });
    const data = (await res.json().catch(() => ({}))) as { deals?: PartnerDealRow[]; error?: string };
    if (!res.ok) return { ok: false, error: data.error || res.statusText };
    return { ok: true, deals: data.deals ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export async function postAdminDealDelete(
  sessionToken: string,
  id: string
): Promise<{ ok: true; deals: PartnerDealRow[] } | { ok: false; error: string }> {
  const base = baseUrl();
  if (!base) return { ok: false, error: "Chưa cấu hình API." };
  try {
    const res = await fetch(`${base}/api/admin/deals/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken.trim()}`,
      },
      body: JSON.stringify({ id }),
    });
    const data = (await res.json().catch(() => ({}))) as { deals?: PartnerDealRow[]; error?: string };
    if (!res.ok) return { ok: false, error: data.error || res.statusText };
    return { ok: true, deals: data.deals ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export async function postIsrcNext(
  sessionToken: string
): Promise<{ ok: true; isrc: string } | { ok: false; error: string }> {
  const base = baseUrl();
  if (!base) return { ok: false, error: "Chưa cấu hình API." };
  try {
    const res = await fetch(`${base}/api/isrc/next`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken.trim()}`,
      },
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; isrc?: string; error?: string };
    if (!res.ok || !data.isrc) return { ok: false, error: data.error || res.statusText };
    return { ok: true, isrc: data.isrc };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi mạng" };
  }
}

export async function postUpcNext(
  sessionToken: string
): Promise<{ ok: true; upc: string; sequence: number } | { ok: false; error: string }> {
  const base = baseUrl();
  if (!base) return { ok: false, error: "Chưa cấu hình API." };
  try {
    const res = await fetch(`${base}/api/upc/next`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken.trim()}`,
      },
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      upc?: string;
      sequence?: number;
      error?: string;
    };
    if (!res.ok || !data.upc) return { ok: false, error: data.error || res.statusText };
    return { ok: true, upc: data.upc, sequence: data.sequence ?? 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi mạng" };
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
    const sf = Array.isArray((data as { sftpDelivery?: unknown[] }).sftpDelivery)
      ? ` — SFTP: ${(data as { sftpDelivery: { ok?: boolean }[] }).sftpDelivery.filter((x) => x.ok).length}/${(data as { sftpDelivery: unknown[] }).sftpDelivery.length} host OK`
      : "";
    return { ok: true, message: `Batch DDEX: đã xuất ${n} file XML${sk}${cd}${sf}` };
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
      sftp?: { label: string; host: string; ok: boolean; error?: string }[];
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
    if (data.sftp?.length) {
      const okS = data.sftp.filter((x) => x.ok).length;
      message += ` — SFTP: ${okS}/${data.sftp.length} host OK`;
      const bad = data.sftp.filter((x) => !x.ok);
      if (bad.length) message += ` (${bad.map((b) => `${b.label}: ${b.error ?? "lỗi"}`).join("; ")})`;
    }
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
  sftp?: {
    configured: boolean;
    targetCount: number;
    targets: { host: string; port: number; remoteDir: string; label?: string }[];
  };
  stores: { storeKey: string; hasEndpoint: boolean }[];
  /** Cửa hàng CIS từ mọi deal đối tác `active` — gộp khi gửi DDEX. */
  activeDealCisStoreKeys?: string[];
} | null> {
  const base = baseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/delivery/status`);
    if (!res.ok) return null;
    return (await res.json()) as {
      cisAutoDelivery: boolean;
      sftpConfigured?: boolean;
      sftp?: {
        configured: boolean;
        targetCount: number;
        targets: { host: string; port: number; remoteDir: string; label?: string }[];
      };
      stores: { storeKey: string; hasEndpoint: boolean }[];
      activeDealCisStoreKeys?: string[];
    };
  } catch {
    return null;
  }
}
