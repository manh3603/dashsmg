import fs from "node:fs";
import path from "node:path";
import express, { type Express, type Request } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function publicBackendBase(req: Request): string {
  const fromEnv = process.env.PUBLIC_BACKEND_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = req.get("host") || `localhost:${process.env.PORT || 3001}`;
  const xfProto = req.get("x-forwarded-proto");
  const proto = (xfProto && xfProto.split(",")[0]?.trim()) || req.protocol || "http";
  return `${proto}://${host}`;
}

const audioMime = new Set([
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/mpeg",
  "audio/mp3",
]);
const imageMime = new Set(["image/jpeg", "image/png", "image/webp"]);

function extAudioOk(name: string): boolean {
  return /\.(wav|flac|mp3)$/i.test(name);
}
function extImageOk(name: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(name);
}

function uploadTableRow(kind: "Âm thanh" | "Ảnh bìa", publicUrl: string, original: string, size: number, mime: string) {
  return [
    { field: "Loại asset", value: kind },
    { field: "URL công khai", value: publicUrl },
    { field: "Tên file gốc", value: original },
    { field: "Kích thước (bytes)", value: String(size) },
    { field: "MIME", value: mime },
  ];
}

export function mountUploads(app: Express): void {
  ensureUploadDir();

  const maxAudio = (Number(process.env.UPLOAD_MAX_AUDIO_MB) || 250) * 1024 * 1024;
  const maxCover = (Number(process.env.UPLOAD_MAX_COVER_MB) || 25) * 1024 * 1024;

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadDir();
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".bin";
      cb(null, `${uuidv4()}${ext}`);
    },
  });

  const uploadAudio = multer({
    storage,
    limits: { fileSize: maxAudio },
    fileFilter: (_req, file, cb) => {
      if (audioMime.has(file.mimetype) || extAudioOk(file.originalname)) cb(null, true);
      else cb(new Error("Chỉ chấp nhận WAV, FLAC hoặc MP3"));
    },
  });

  const uploadCover = multer({
    storage,
    limits: { fileSize: maxCover },
    fileFilter: (_req, file, cb) => {
      if (imageMime.has(file.mimetype) || extImageOk(file.originalname)) cb(null, true);
      else cb(new Error("Chỉ chấp nhận JPG, PNG hoặc WEBP"));
    },
  });

  app.use("/uploads", express.static(UPLOAD_DIR));

  app.post("/api/uploads/audio", (req, res) => {
    uploadAudio.single("file")(req, res, (err: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(400).json({ error: msg });
        return;
      }
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "Thiếu file (field name: file)" });
        return;
      }
      const base = publicBackendBase(req);
      const publicUrl = `${base}/uploads/${encodeURIComponent(file.filename)}`;
      res.json({
        ok: true,
        url: publicUrl,
        filename: file.originalname,
        storedAs: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        table: uploadTableRow("Âm thanh", publicUrl, file.originalname, file.size, file.mimetype),
      });
    });
  });

  app.post("/api/uploads/cover", (req, res) => {
    uploadCover.single("file")(req, res, (err: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(400).json({ error: msg });
        return;
      }
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "Thiếu file (field name: file)" });
        return;
      }
      const base = publicBackendBase(req);
      const publicUrl = `${base}/uploads/${encodeURIComponent(file.filename)}`;
      res.json({
        ok: true,
        url: publicUrl,
        filename: file.originalname,
        storedAs: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        table: uploadTableRow("Ảnh bìa", publicUrl, file.originalname, file.size, file.mimetype),
      });
    });
  });
}
