import "dotenv/config";
import cors from "cors";
import express from "express";
import type { CatalogItem } from "./types.js";
import { bulkUpsert, listReleases, upsertRelease, getRelease, updateStatus, patchRelease, removeRelease } from "./store.js";
import { runDdexBatchForPendingStores, scheduleDailyDdex } from "./jobs/dailyDdex.js";
import { writeErnFile } from "./ddex/buildErn.js";
import { writeCisDdexBundle, streamCisZipToResponse } from "./ddex/cisBundle.js";
import { loadCisRecipients } from "./ddex/cisParties.js";
import { deliverCisRelease } from "./delivery/deliverRelease.js";
import { cisStoreDisplayName, listCisDeliveryConfigured } from "./delivery/cisEnv.js";
import { fetchPartnerAnalyticsReport } from "./analyticsPartnerReport.js";
import { isSftpDeliveryConfigured } from "./delivery/sftpEnv.js";
import { catalogItemToTable, tableToMatrix } from "./releaseTable.js";
import { mountUploads } from "./uploads.js";
import { identifyFromAudioUrl, isAcrConfigured } from "./acrcloud/identify.js";
import { listDemoAccountHints } from "./auth/demoLogin.js";
import { tryAuthLogin } from "./auth/login.js";
import {
  createFirstPlatformAdmin,
  createStoredAccount,
  deleteStoredAccount,
  listPublicAccounts,
  upsertStoredAccountAdmin,
} from "./accountsStore.js";
import { allocateNextIsrc } from "./isrcAllocator.js";
import { getBearerToken, issueSession, resolveSession, revokeSession } from "./sessionsStore.js";
import { deleteDeal, listDeals, upsertDeal } from "./dealsStore.js";

const app = express();
const PORT = Number(process.env.PORT || 3001);
/** Production / CORS_STRICT: chỉ các origin này. Dev: phản chiếu Origin (tiện LAN, Postman). */
const CORS_ORIGIN =
  process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000";
const corsAllowed = CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
const corsStrict = process.env.CORS_STRICT === "1";
const nodeEnvProd = process.env.NODE_ENV === "production";

app.use(
  cors(
    !nodeEnvProd && !corsStrict
      ? { origin: true, credentials: true }
      : { origin: corsAllowed.length ? corsAllowed : true, credentials: true }
  )
);
// Multipart upload trước body parser JSON — tránh xung đột stream (multer)
mountUploads(app);
app.use(express.json({ limit: "10mb" }));

/** Bật gợi ý tài khoản env (DEMO_AUTH_*) chỉ khi AUTH_DEMO_HINTS=1 — production không bật. */
function demoHintsEnabled(): boolean {
  const v = String(process.env.AUTH_DEMO_HINTS ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Gợi ý tài khoản dev (không lộ mật khẩu). Mặc định tắt; bật bằng AUTH_DEMO_HINTS=1. */
app.get("/api/auth/demo-hints", (_req, res) => {
  if (!demoHintsEnabled()) {
    res.json({ accounts: [], note: undefined });
    return;
  }
  res.json({
    accounts: listDemoAccountHints(),
    note: "Chỉ dùng khi phát triển. Production: đăng ký / quản trị tài khoản trên server (data/accounts.json). Mật khẩu env: DEMO_AUTH_* trong backend/.env nếu bật gợi ý.",
  });
});

/** Đăng nhập demo — xác thực trên server, không gửi hash mật khẩu xuống client bundle. */
app.get("/api/auth/login", (_req, res) => {
  res.status(405).json({
    ok: false,
    error: "Endpoint này chỉ hỗ trợ POST. Hãy gọi POST /api/auth/login với JSON { login, password }.",
  });
});

app.post("/api/auth/login", (req, res) => {
  const login = typeof (req.body as { login?: string })?.login === "string" ? String((req.body as { login: string }).login) : "";
  const password = typeof (req.body as { password?: string })?.password === "string" ? String((req.body as { password: string }).password) : "";
  const result = tryAuthLogin(login, password);
  if (!result) {
    res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu." });
    return;
  }
  const sessionToken = issueSession(result.login, result.role, result.displayName);
  res.json({
    ok: true,
    role: result.role,
    displayName: result.displayName,
    login: result.login,
    sessionToken,
  });
});

app.post("/api/auth/logout", (req, res) => {
  const tok = getBearerToken(req.headers.authorization);
  revokeSession(tok);
  res.json({ ok: true });
});

/** Đăng ký công khai: nghệ sĩ hoặc admin nhãn (customer_admin). */
app.post("/api/auth/register", (req, res) => {
  const b = req.body as {
    login?: string;
    password?: string;
    displayName?: string;
    accountType?: string;
    orgLabel?: string;
  };
  const login = typeof b.login === "string" ? b.login : "";
  const password = typeof b.password === "string" ? b.password : "";
  const displayName = typeof b.displayName === "string" ? b.displayName : "";
  const accountType = typeof b.accountType === "string" ? b.accountType : "";
  const orgLabel = typeof b.orgLabel === "string" ? b.orgLabel : "";
  const role = accountType === "label" ? "customer_admin" : "artist";
  if (accountType !== "artist" && accountType !== "label") {
    res.status(400).json({ error: "accountType phải là artist hoặc label." });
    return;
  }
  const created = createStoredAccount({
    login,
    password,
    role,
    displayName,
    orgLabel: accountType === "label" ? orgLabel : undefined,
  });
  if (!created.ok) {
    res.status(400).json({ error: created.error });
    return;
  }
  const row = tryAuthLogin(login, password);
  if (!row) {
    res.status(500).json({ error: "Đã tạo tài khoản nhưng không đăng nhập được — liên hệ quản trị." });
    return;
  }
  const sessionToken = issueSession(row.login, row.role, row.displayName);
  res.json({
    ok: true,
    role: row.role,
    displayName: row.displayName,
    login: row.login,
    sessionToken,
  });
});

/**
 * Tạo quản trị nền tảng đầu tiên (một lần), khi chưa có platform_admin trong data/accounts.json.
 * Cần AUTH_BOOTSTRAP_SECRET trong backend/.env trùng với body.bootstrapSecret.
 */
app.post("/api/auth/bootstrap-first-admin", (req, res) => {
  const secret = process.env.AUTH_BOOTSTRAP_SECRET?.trim();
  if (!secret) {
    res.status(503).json({ error: "Chưa bật AUTH_BOOTSTRAP_SECRET trên server." });
    return;
  }
  const b = req.body as { bootstrapSecret?: string; login?: string; password?: string; displayName?: string };
  if (typeof b.bootstrapSecret !== "string" || b.bootstrapSecret !== secret) {
    res.status(403).json({ error: "Không hợp lệ." });
    return;
  }
  const out = createFirstPlatformAdmin({
    login: typeof b.login === "string" ? b.login : "",
    password: typeof b.password === "string" ? b.password : "",
    displayName: typeof b.displayName === "string" ? b.displayName : "",
  });
  if (!out.ok) {
    res.status(400).json({ error: out.error });
    return;
  }
  const login = typeof b.login === "string" ? b.login.trim() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const row = tryAuthLogin(login, password);
  if (!row) {
    res.status(500).json({ error: "Đã tạo nhưng không xác thực được." });
    return;
  }
  const sessionToken = issueSession(row.login, row.role, row.displayName);
  res.json({ ok: true, role: row.role, displayName: row.displayName, login: row.login, sessionToken });
});

function requirePlatformAdminSession(req: import("express").Request, res: import("express").Response) {
  const tok = getBearerToken(req.headers.authorization);
  const s = resolveSession(tok);
  if (!s || s.role !== "platform_admin") {
    res.status(403).json({ error: "Cần phiên quản trị nền tảng (Bearer sessionToken sau đăng nhập)." });
    return null;
  }
  return s;
}

/** Phân tích / báo cáo — admin nền tảng hoặc admin nhãn (cùng quyền xem trang Analytics). */
function requireFinancialReportsSession(req: import("express").Request, res: import("express").Response) {
  const tok = getBearerToken(req.headers.authorization);
  const s = resolveSession(tok);
  if (!s) {
    res.status(401).json({ error: "Cần đăng nhập (Authorization: Bearer sessionToken)." });
    return null;
  }
  if (s.role !== "platform_admin" && s.role !== "customer_admin") {
    res.status(403).json({ error: "Chỉ quản trị nền tảng hoặc admin nhãn mới xem được ngữ cảnh phân tích." });
    return null;
  }
  return s;
}

app.post("/api/admin/account-list", (req, res) => {
  if (!requirePlatformAdminSession(req, res)) return;
  res.json({ accounts: listPublicAccounts() });
});

app.post("/api/admin/account-upsert", (req, res) => {
  if (!requirePlatformAdminSession(req, res)) return;
  const b = req.body as {
    login?: string;
    password?: string;
    displayName?: string;
    role?: string;
    orgLabel?: string;
    royaltySharePercent?: number | null;
  };
  const login = typeof b.login === "string" ? b.login : "";
  if (!login.trim()) {
    res.status(400).json({ error: "Thiếu login." });
    return;
  }
  const role = b.role === "customer_admin" || b.role === "platform_admin" || b.role === "artist" ? b.role : null;
  if (!role) {
    res.status(400).json({ error: "role không hợp lệ." });
    return;
  }
  const out = upsertStoredAccountAdmin({
    login,
    password: typeof b.password === "string" ? b.password : undefined,
    displayName: typeof b.displayName === "string" ? b.displayName : login,
    role,
    orgLabel: typeof b.orgLabel === "string" ? b.orgLabel : undefined,
    royaltySharePercent: b.royaltySharePercent,
  });
  if (!out.ok) {
    res.status(400).json({ error: out.error });
    return;
  }
  res.json({ ok: true, accounts: listPublicAccounts() });
});

app.post("/api/admin/account-delete", (req, res) => {
  const sess = requirePlatformAdminSession(req, res);
  if (!sess) return;
  const b = req.body as { targetLogin?: string };
  const target = typeof b.targetLogin === "string" ? b.targetLogin.trim() : "";
  if (!target) {
    res.status(400).json({ error: "Thiếu targetLogin." });
    return;
  }
  if (target.toLowerCase() === sess.login.toLowerCase()) {
    res.status(400).json({ error: "Không thể tự xóa chính mình qua API này." });
    return;
  }
  const out = deleteStoredAccount(target);
  if (!out.ok) {
    res.status(400).json({ error: out.error });
    return;
  }
  res.json({ ok: true, accounts: listPublicAccounts() });
});

/** Hợp đồng / deal đối tác — chỉ quản trị nền tảng. */
app.post("/api/admin/deals/list", (req, res) => {
  if (!requirePlatformAdminSession(req, res)) return;
  res.json({ deals: listDeals() });
});

app.post("/api/admin/deals/upsert", (req, res) => {
  if (!requirePlatformAdminSession(req, res)) return;
  const b = req.body as {
    id?: string;
    partnerName?: string;
    contractRef?: string;
    territory?: string;
    revenueTerms?: string;
    validFrom?: string;
    validTo?: string;
    contactEmail?: string;
    notes?: string;
    reportingStores?: string;
    status?: string;
  };
  const out = upsertDeal({
    id: typeof b.id === "string" ? b.id : undefined,
    partnerName: typeof b.partnerName === "string" ? b.partnerName : "",
    contractRef: typeof b.contractRef === "string" ? b.contractRef : undefined,
    territory: typeof b.territory === "string" ? b.territory : undefined,
    revenueTerms: typeof b.revenueTerms === "string" ? b.revenueTerms : undefined,
    validFrom: typeof b.validFrom === "string" ? b.validFrom : undefined,
    validTo: typeof b.validTo === "string" ? b.validTo : undefined,
    contactEmail: typeof b.contactEmail === "string" ? b.contactEmail : undefined,
    notes: typeof b.notes === "string" ? b.notes : undefined,
    reportingStores: typeof b.reportingStores === "string" ? b.reportingStores : undefined,
    status: b.status === "active" || b.status === "archived" || b.status === "draft" ? b.status : undefined,
  });
  if (!out.ok) {
    res.status(400).json({ error: out.error });
    return;
  }
  res.json({ ok: true, deals: listDeals(), deal: out.deal });
});

app.post("/api/admin/deals/delete", (req, res) => {
  if (!requirePlatformAdminSession(req, res)) return;
  const b = req.body as { id?: string };
  const id = typeof b.id === "string" ? b.id.trim() : "";
  if (!id) {
    res.status(400).json({ error: "Thiếu id." });
    return;
  }
  const out = deleteDeal(id);
  if (!out.ok) {
    res.status(400).json({ error: out.error });
    return;
  }
  res.json({ ok: true, deals: listDeals() });
});

/** Cấp ISRC tiếp theo trong dải đã cấu hình — cần phiên đăng nhập bất kỳ. */
app.post("/api/isrc/next", (req, res) => {
  const tok = getBearerToken(req.headers.authorization);
  const s = resolveSession(tok);
  if (!s) {
    res.status(401).json({ error: "Cần đăng nhập (Authorization: Bearer sessionToken)." });
    return;
  }
  const out = allocateNextIsrc();
  if (!out.ok) {
    res.status(400).json({ error: out.error });
    return;
  }
  res.json({ ok: true, isrc: out.isrc });
});

function senderOpts() {
  return {
    senderPartyId: process.env.DDEX_MESSAGE_SENDER_PARTY_ID?.trim() ?? "",
    recipientPartyId: process.env.DDEX_MESSAGE_RECIPIENT_PARTY_ID?.trim() ?? "",
  };
}

function parseCatalogBody(body: Record<string, unknown>): import("./types.js").CatalogItem | null {
  if (!body.id || !body.title) return null;
  const str = (k: string) => (body[k] != null ? String(body[k]) : undefined);
  return {
    id: String(body.id),
    title: String(body.title),
    type: body.type === "Album/EP" ? "Album/EP" : "Single",
    status: (body.status as import("./types.js").CatalogItem["status"]) || "pending_qc",
    isrc: body.isrc != null ? String(body.isrc) : "—",
    upc: body.upc != null ? String(body.upc) : "—",
    updated: body.updated != null ? String(body.updated) : new Date().toISOString().slice(0, 10),
    artist: str("artist"),
    storesSelected: Array.isArray(body.storesSelected) ? (body.storesSelected as string[]) : undefined,
    labelName: str("labelName"),
    language: str("language"),
    genreMain: str("genreMain"),
    genreSub: str("genreSub"),
    territories: str("territories"),
    releaseDate: str("releaseDate"),
    preorder: typeof body.preorder === "boolean" ? body.preorder : undefined,
    composer: str("composer"),
    artistFeatured: str("artistFeatured"),
    audioAssetUrl: str("audioAssetUrl"),
    coverAssetUrl: str("coverAssetUrl"),
    pline: str("pline"),
    cline: str("cline"),
    version: str("version"),
    durationIso8601: str("durationIso8601"),
    qcFeedback: str("qcFeedback"),
  };
}

app.get("/health", (_req, res) => {
  const analyticsFeed = ["1", "true", "yes"].includes(String(process.env.ANALYTICS_FEED_ENABLED ?? "").trim().toLowerCase());
  const analyticsPartnerReport = Boolean(process.env.ANALYTICS_PARTNER_REPORT_URL?.trim());
  const analyticsReportMock = ["1", "true", "yes"].includes(String(process.env.ANALYTICS_REPORT_MOCK ?? "").trim().toLowerCase());
  res.json({
    ok: true,
    service: "smg-distribution-backend",
    /** Có trong bản build hiện tại; nếu thiếu field này → đang chạy process/backend cũ, cần restart */
    uploadApi: true,
    /** ACRCloud Identify — QC nhận diện bản ghi từ URL audio */
    acrIdentify: isAcrConfigured(),
    /** Bật ANALYTICS_FEED_ENABLED=1 khi đã nối feed báo cáo DSP — frontend hiển thị khu phân tích */
    analyticsFeed,
    /** Đã đặt ANALYTICS_PARTNER_REPORT_URL — Dashboard gọi POST /api/analytics/report để lấy stream theo store */
    analyticsPartnerReport,
    /** ANALYTICS_REPORT_MOCK=1 — trả dữ liệu mẫu cho trang Phân tích */
    analyticsReportMock,
  });
});

/** Ngữ cảnh phân tích đa deal / đa cửa hàng — cần phiên (Dashboard → Analytics). */
app.post("/api/analytics/context", (req, res) => {
  if (!requireFinancialReportsSession(req, res)) return;
  const analyticsFeed = ["1", "true", "yes"].includes(String(process.env.ANALYTICS_FEED_ENABLED ?? "").trim().toLowerCase());
  const cisStores = listCisDeliveryConfigured().map(({ storeKey, hasEndpoint }) => ({
    storeKey,
    label: cisStoreDisplayName(storeKey),
    hasEndpoint,
  }));
  const deals = listDeals().map((d) => ({
    id: d.id,
    partnerName: d.partnerName,
    status: d.status,
    territory: d.territory ?? null,
    reportingStores:
      d.reportingStores?.trim().length
        ? d.reportingStores
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
  }));
  const activeDeals = deals.filter((x) => x.status === "active");
  const reportingTags = new Set<string>();
  for (const d of activeDeals) {
    for (const t of d.reportingStores) reportingTags.add(t);
  }
  res.json({
    analyticsFeed,
    cisStores,
    deals,
    activeDealCount: activeDeals.length,
    /** Gộp mọi nhãn «cửa hàng báo cáo» từ deal đang active — map tới job ingest / slice biểu đồ. */
    activeReportingStoreTags: [...reportingTags],
  });
});

/** Báo cáo stream theo cửa hàng — backend gọi URL đối tác (ANALYTICS_PARTNER_REPORT_URL). */
app.post("/api/analytics/report", async (req, res) => {
  if (!requireFinancialReportsSession(req, res)) return;
  const r = await fetchPartnerAnalyticsReport();
  if (!r.configured) {
    res.json({ ok: true, configured: false, fetchOk: false, stores: [] });
    return;
  }
  if (!r.fetchOk) {
    res.json({
      ok: true,
      configured: true,
      fetchOk: false,
      stores: [],
      error: r.error ?? "Lỗi không xác định",
    });
    return;
  }
  res.json({
    ok: true,
    configured: true,
    fetchOk: true,
    stores: r.stores,
    asOf: r.asOf,
  });
});

app.get("/api/releases", (_req, res) => {
  res.json({ releases: listReleases() });
});

app.post("/api/releases", (req, res) => {
  const item = parseCatalogBody(req.body as Record<string, unknown>);
  if (!item) {
    res.status(400).json({ error: "Cần id và title" });
    return;
  }
  upsertRelease(item);
  const table = catalogItemToTable(item);
  res.json({ release: item, table, tableMatrix: tableToMatrix(table) });
});

/** Bulk: mảng release hoặc { releases: [...] } */
app.post("/api/releases/bulk", (req, res) => {
  const raw = req.body;
  const arr: unknown = Array.isArray(raw) ? raw : (raw as { releases?: unknown }).releases;
  if (!Array.isArray(arr)) {
    res.status(400).json({ error: "Body phải là mảng hoặc { releases: [] }" });
    return;
  }
  const items: CatalogItem[] = [];
  for (const x of arr) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const parsed = parseCatalogBody(o);
    if (parsed) items.push({ ...parsed, status: (o.status as CatalogItem["status"]) || "draft" });
  }
  const { inserted, updated } = bulkUpsert(items);
  res.json({ ok: true, count: items.length, inserted, updated });
});

app.patch("/api/releases/:id/status", (req, res) => {
  const body = req.body as { status?: string; qcFeedback?: string | null };
  const allowed: CatalogItem["status"][] = [
    "draft",
    "pending_qc",
    "rejected",
    "sent_to_stores",
    "live",
    "takedown",
    "pending",
  ];
  if (!body.status || !allowed.includes(body.status as CatalogItem["status"])) {
    res.status(400).json({ error: "status không hợp lệ" });
    return;
  }
  const patch: Partial<CatalogItem> = { status: body.status as CatalogItem["status"] };
  if ("qcFeedback" in body) {
    const q = body.qcFeedback;
    patch.qcFeedback = q == null || String(q).trim() === "" ? undefined : String(q).trim();
  }
  const r = patchRelease(req.params.id, patch);
  if (!r) {
    res.status(404).json({ error: "Không tìm thấy" });
    return;
  }
  res.json({ release: r });
});

app.delete("/api/releases/:id", (req, res) => {
  const ok = removeRelease(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Không tìm thấy" });
    return;
  }
  res.json({ ok: true });
});

/** Xuất DDEX XML cho một release (không đổi trạng thái) */
app.post("/api/ddex/export/:id", (req, res) => {
  const item = getRelease(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Không tìm thấy" });
    return;
  }
  const outputDir = process.env.DDEX_OUTPUT_DIR || "./data/ddex-out";
  const so = senderOpts();
  if (!so.senderPartyId || !so.recipientPartyId) {
    res.status(400).json({
      error:
        "Thiếu DDEX_MESSAGE_SENDER_PARTY_ID hoặc DDEX_MESSAGE_RECIPIENT_PARTY_ID trong backend/.env — không sinh ERN mặc định từ mã nguồn.",
    });
    return;
  }
  try {
    const path = writeErnFile(item, outputDir, so);
    res.json({ ok: true, path });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/** Gói DDEX riêng cho từng cửa hàng CIS (VK, Yandex, ZVUK, Kion) */
app.post("/api/ddex/export-cis/:id", (req, res) => {
  const item = getRelease(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Không tìm thấy" });
    return;
  }
  const outputDir = process.env.DDEX_OUTPUT_DIR || "./data/ddex-out";
  const bundle = writeCisDdexBundle(item, outputDir);
  if (!bundle.ok) {
    res.status(400).json({ errors: bundle.errors });
    return;
  }
  res.json({ ok: true, dir: bundle.dir, files: bundle.files });
});

/** Tải ZIP chứa các file ERN CIS */
app.get("/api/ddex/export-cis/:id/zip", async (req, res) => {
  try {
    const item = getRelease(req.params.id);
    if (!item) {
      res.status(404).json({ error: "Không tìm thấy" });
      return;
    }
    const outputDir = process.env.DDEX_OUTPUT_DIR || "./data/ddex-out";
    const out = await streamCisZipToResponse(item, outputDir, res);
    if (!out.ok && !res.headersSent) {
      res.status(400).json({ errors: out.errors });
    }
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  }
});

/** Cấu hình công khai — tên cửa hàng (PADPIDA không trả về) */
app.get("/api/config/cis-stores", (_req, res) => {
  const r = loadCisRecipients();
  res.json({
    stores: Object.entries(r).map(([key, v]) => ({
      key,
      displayName: v.partyName,
    })),
  });
});

/**
 * QC — nhận diện audio qua ACRCloud (tải mẫu từ URL master khách gửi).
 * Cấu hình: ACRCLOUD_HOST, ACRCLOUD_ACCESS_KEY, ACRCLOUD_ACCESS_SECRET
 */
app.post("/api/qc/acr-identify", async (req, res) => {
  if (!isAcrConfigured()) {
    res.status(503).json({
      error:
        "Chưa bật ACRCloud. Trong backend/.env đặt ACRCLOUD_ACCESS_KEY + ACRCLOUD_ACCESS_SECRET, hoặc ACRCLOUD_MOCK=1 để chạy thử (không gọi API thật), rồi khởi động lại API.",
    });
    return;
  }
  const body = req.body as { audioUrl?: string; releaseTitle?: string; releaseArtist?: string };
  const audioUrl = typeof body.audioUrl === "string" ? String(body.audioUrl).trim() : "";
  if (!audioUrl || !/^https?:\/\//i.test(audioUrl)) {
    res.status(400).json({ error: "Cần audioUrl hợp lệ (https://…)" });
    return;
  }
  try {
    const { raw, summary } = await identifyFromAudioUrl(audioUrl, {
      releaseTitle: typeof body.releaseTitle === "string" ? body.releaseTitle : undefined,
      releaseArtist: typeof body.releaseArtist === "string" ? body.releaseArtist : undefined,
    });
    const includeRaw = String(process.env.ACRCLOUD_RETURN_RAW_JSON ?? "").toLowerCase() === "true";
    res.json({ ok: true, summary, ...(includeRaw ? { raw } : {}) });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/** Chạy batch giống job daily (pending_qc → sent_to_stores + ghi XML; CIS_AUTO_DELIVERY=true thì POST lên store) */
app.post("/api/ddex/run-batch", async (_req, res) => {
  try {
    const result = await runDdexBatchForPendingStores();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/**
 * Phân phối CIS: ghi ERN + POST lên từng URL đã cấu hình (CIS_DELIVERY_*_URL).
 * Query: finalize=1 → cập nhật trạng thái sent_to_stores khi mọi endpoint bắt buộc thành công.
 *        writeFiles=0 → chỉ gửi HTTP, không ghi đĩa.
 */
app.post("/api/delivery/push/:id", async (req, res) => {
  const item = getRelease(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Không tìm thấy" });
    return;
  }
  const outputDir = process.env.DDEX_OUTPUT_DIR || "./data/ddex-out";
  const writeFiles = String(req.query.writeFiles ?? "1") !== "0";
  const finalize = String(req.query.finalize ?? "") === "1";
  try {
    const outcome = await deliverCisRelease(item, { writeFiles, outputDir });
    if (finalize && outcome.ok) {
      updateStatus(item.id, "sent_to_stores");
    }
    res.json({
      ok: outcome.ok,
      summary: outcome.summary,
      results: outcome.results,
      files: outcome.files,
      finalized: Boolean(finalize && outcome.ok),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/** Store nào đã khai báo URL gửi (không lộ secret) */
app.get("/api/delivery/status", (_req, res) => {
  res.json({
    stores: listCisDeliveryConfigured(),
    cisAutoDelivery: (process.env.CIS_AUTO_DELIVERY || "").toLowerCase() === "true",
    sftpConfigured: isSftpDeliveryConfigured(),
  });
});

const BIND_HOST = process.env.BIND_HOST || "0.0.0.0";

app.listen(PORT, BIND_HOST, () => {
  const where = BIND_HOST === "0.0.0.0" ? `0.0.0.0:${PORT} (LAN: http://<IP-máy>:${PORT})` : `${BIND_HOST}:${PORT}`;
  console.log(`SMG backend ${where} — CORS dev=phản chiếu Origin; prod=${CORS_ORIGIN}`);
  console.log(`Upload: POST /api/uploads/audio | POST /api/uploads/cover (field: file)`);
  const hasAcrKeys = Boolean(
    process.env.ACRCLOUD_ACCESS_KEY?.trim() && process.env.ACRCLOUD_ACCESS_SECRET?.trim()
  );
  const acrMock = ["1", "true", "yes"].includes(String(process.env.ACRCLOUD_MOCK ?? "").trim().toLowerCase());
  if (hasAcrKeys) console.log("ACRCloud: Identify thật (đã có ACCESS_KEY/SECRET).");
  else if (acrMock) console.log("ACRCloud: ACRCLOUD_MOCK — /health acrIdentify=true, QC không gọi API.");
  else console.log("ACRCloud: chưa bật — thêm key hoặc ACRCLOUD_MOCK=1 trong backend/.env");
  const cronExpr = process.env.DDEX_DAILY_CRON || "0 2 * * *";
  scheduleDailyDdex(cronExpr);
});
