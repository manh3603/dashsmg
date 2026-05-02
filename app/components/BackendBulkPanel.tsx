"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Download, FileJson, Play, Rocket, Upload } from "lucide-react";
import type { CatalogItem } from "@/lib/smg-storage";
import {
  fetchBackendHealth,
  fetchBackendReleases,
  getCisDdexZipUrl,
  isBackendConfigured,
  postBulkReleasesToBackend,
  postCisDeliveryPush,
  postExportCisDdex,
  triggerDdexBatch,
} from "@/lib/backend-api";

const SAMPLE = `[
  {
    "id": "release-id-1",
    "title": "Tiêu đề",
    "type": "Single",
    "status": "pending_qc",
    "isrc": "CC-XXX-26-00001",
    "upc": "—",
    "updated": "2026-05-01",
    "artist": "Nghệ sĩ",
    "territories": "vn",
    "releaseDate": "2026-06-01",
    "audioAssetUrl": "https://…/master.wav",
    "storesSelected": ["zing_mp3"]
  }
]`;

function parseCatalogFromJson(json: string): { items: CatalogItem[] | null; error: string | null } {
  try {
    const data = JSON.parse(json) as unknown;
    const arr = Array.isArray(data) ? data : (data as { releases?: unknown }).releases;
    if (!Array.isArray(arr)) return { items: null, error: "JSON phải là mảng hoặc { releases: [] }" };
    const out: CatalogItem[] = [];
    for (const x of arr) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      if (!o.id || !o.title) continue;
      out.push({
        id: String(o.id),
        title: String(o.title),
        type: o.type === "Album/EP" ? "Album/EP" : "Single",
        status: (o.status as CatalogItem["status"]) || "pending_qc",
        isrc: o.isrc != null ? String(o.isrc) : "—",
        upc: o.upc != null ? String(o.upc) : "—",
        updated: o.updated != null ? String(o.updated) : new Date().toISOString().slice(0, 10),
        artist: o.artist != null ? String(o.artist) : undefined,
        storesSelected: Array.isArray(o.storesSelected) ? (o.storesSelected as string[]) : undefined,
        labelName: o.labelName != null ? String(o.labelName) : undefined,
        language: o.language != null ? String(o.language) : undefined,
        genreMain: o.genreMain != null ? String(o.genreMain) : undefined,
        genreSub: o.genreSub != null ? String(o.genreSub) : undefined,
        territories: o.territories != null ? String(o.territories) : undefined,
        releaseDate: o.releaseDate != null ? String(o.releaseDate) : undefined,
        preorder: typeof o.preorder === "boolean" ? o.preorder : undefined,
        composer: o.composer != null ? String(o.composer) : undefined,
        artistFeatured: o.artistFeatured != null ? String(o.artistFeatured) : undefined,
        audioAssetUrl: o.audioAssetUrl != null ? String(o.audioAssetUrl) : undefined,
        coverAssetUrl: o.coverAssetUrl != null ? String(o.coverAssetUrl) : undefined,
        pline: o.pline != null ? String(o.pline) : undefined,
        cline: o.cline != null ? String(o.cline) : undefined,
        version: o.version != null ? String(o.version) : undefined,
        durationIso8601: o.durationIso8601 != null ? String(o.durationIso8601) : undefined,
      });
    }
    if (!out.length) return { items: null, error: "Không có bản ghi hợp lệ (cần id, title)." };
    return { items: out, error: null };
  } catch {
    return { items: null, error: "JSON không hợp lệ." };
  }
}

export default function BackendBulkPanel() {
  const [json, setJson] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [health, setHealth] = useState<"unknown" | "ok" | "fail">("unknown");
  const [releases, setReleases] = useState<{ id: string; title: string }[]>([]);
  const [pickId, setPickId] = useState("");
  const [finalizeAfterPush, setFinalizeAfterPush] = useState(false);

  const refreshReleases = useCallback(async () => {
    const list = await fetchBackendReleases();
    setReleases(list.map((r) => ({ id: r.id, title: r.title })));
    setPickId((prev) => (prev || (list[0]?.id ?? "")));
  }, []);

  useEffect(() => {
    if (!isBackendConfigured()) return;
    let cancelled = false;
    void fetchBackendReleases().then((list) => {
      if (cancelled) return;
      setReleases(list.map((r) => ({ id: r.id, title: r.title })));
      setPickId((prev) => (prev || (list[0]?.id ?? "")));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const checkHealth = useCallback(async () => {
    if (!isBackendConfigured()) {
      setHealth("fail");
      return;
    }
    const ok = await fetchBackendHealth();
    setHealth(ok ? "ok" : "fail");
  }, []);

  const onBulk = async () => {
    setMsg(null);
    const { items, error } = parseCatalogFromJson(json);
    if (!items) {
      setMsg(error);
      return;
    }
    setBusy(true);
    const r = await postBulkReleasesToBackend(items);
    setBusy(false);
    setMsg(r.ok ? r.message : r.message);
    if (r.ok) void refreshReleases();
  };

  const onBatch = async () => {
    setMsg(null);
    setBusy(true);
    const r = await triggerDdexBatch();
    setBusy(false);
    setMsg(r.ok ? r.message : r.message);
  };

  const onExportCis = async () => {
    setMsg(null);
    if (!pickId) {
      setMsg("Chọn một release.");
      return;
    }
    setBusy(true);
    const r = await postExportCisDdex(pickId);
    setBusy(false);
    setMsg(r.ok ? `${r.message} — thư mục backend/data/ddex-out/cis/` : r.message);
  };

  const onPushStores = async () => {
    setMsg(null);
    if (!pickId) {
      setMsg("Chọn một release.");
      return;
    }
    setBusy(true);
    const r = await postCisDeliveryPush(pickId, { finalize: finalizeAfterPush, writeFiles: true });
    setBusy(false);
    setMsg(r.message);
  };

  const zipUrl = pickId ? getCisDdexZipUrl(pickId) : null;

  if (!isBackendConfigured()) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Không xác định được API backend</p>
        <p className="mt-1 text-amber-800">
          Chạy <code className="rounded bg-amber-100 px-1">npm run dev:all</code> (Next + cổng 3001). Mặc định trình duyệt dùng proxy{" "}
          <code className="rounded bg-amber-100 px-1">/smg-api</code>. Docker: đặt <code className="rounded bg-amber-100 px-1">BACKEND_PROXY_TARGET</code> trong{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <FileJson className="h-5 w-5 text-slate-600" />
          Thao tác theo bản ghi (tuỳ chọn)
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Luồng phát hành chính đã <strong>tự gửi metadata lên cửa hàng</strong> khi bạn bấm gửi. Dùng phần này khi cần tạo lại
          file, tải ZIP hoặc gửi lại thủ công.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Release trên backend</label>
            <select
              className="min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={pickId}
              onChange={(e) => setPickId(e.target.value)}
            >
              <option value="">— Chọn —</option>
              {releases.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.id})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={busy || !pickId}
            onClick={() => void onExportCis()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Sinh file ERN (CIS)
          </button>
          <button
            type="button"
            disabled={busy || !pickId}
            onClick={() => void onPushStores()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Rocket className="h-4 w-4" />
            Phân phối lên store (HTTP)
          </button>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-600"
              checked={finalizeAfterPush}
              onChange={(e) => setFinalizeAfterPush(e.target.checked)}
            />
            Chốt trạng thái sent_to_stores nếu gửi thành công
          </label>
          {zipUrl && (
            <a
              href={zipUrl}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800"
            >
              <Download className="h-4 w-4" />
              Tải ZIP
            </a>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Database className="h-5 w-5 text-cyan-600" />
            Bulk JSON &amp; batch hằng ngày
          </h3>
          <button type="button" onClick={() => void checkHealth()} className="text-xs text-cyan-700 underline">
            Kiểm tra /health
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Nhập JSON lô khi cần nhập nhiều bản ghi; nút batch xử lý các bản <code className="rounded bg-white px-1">pending_qc</code>{" "}
          trên server.
        </p>
        {health !== "unknown" && (
          <p className="mt-2 text-xs">
            Backend:{" "}
            {health === "ok" ? <span className="text-emerald-700">online</span> : <span className="text-red-600">offline</span>}
          </p>
        )}
        <textarea
          className="mt-3 h-36 w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onBulk()}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Gửi bulk
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onBatch()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Chạy batch DDEX
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void refreshReleases()}
            className="text-sm text-slate-600 underline"
          >
            Làm mới danh sách
          </button>
        </div>
        {msg && <p className="mt-2 text-sm text-slate-800">{msg}</p>}
      </div>
    </div>
  );
}
