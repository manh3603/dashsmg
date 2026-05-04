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
import { listCisDeliveryConfigured } from "./delivery/cisEnv.js";
import { isSftpDeliveryConfigured } from "./delivery/sftpEnv.js";
import { catalogItemToTable, tableToMatrix } from "./releaseTable.js";
import { mountUploads } from "./uploads.js";
import { identifyFromAudioUrl, isAcrConfigured } from "./acrcloud/identify.js";
import { listDemoAccountHints, tryDemoLogin } from "./auth/demoLogin.js";

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

/** Gợi ý tài khoản demo (không lộ mật khẩu). */
app.get("/api/auth/demo-hints", (_req, res) => {
  res.json({
    accounts: listDemoAccountHints(),
    note: "Mật khẩu chỉ trong backend/.env: DEMO_AUTH_ADMIN_PASSWORD, DEMO_AUTH_LABEL_PASSWORD, DEMO_AUTH_ARTIST_PASSWORD (bắt buộc — không dùng mặc định trong mã).",
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
  const result = tryDemoLogin(login, password);
  if (!result) {
    res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu." });
    return;
  }
  res.json({
    ok: true,
    role: result.role,
    displayName: result.displayName,
    login: result.login,
  });
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
  res.json({
    ok: true,
    service: "smg-distribution-backend",
    /** Có trong bản build hiện tại; nếu thiếu field này → đang chạy process/backend cũ, cần restart */
    uploadApi: true,
    /** ACRCloud Identify — QC nhận diện bản ghi từ URL audio */
    acrIdentify: isAcrConfigured(),
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
  const allowed: CatalogItem["status"][] = ["draft", "pending_qc", "rejected", "sent_to_stores", "live", "pending"];
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
