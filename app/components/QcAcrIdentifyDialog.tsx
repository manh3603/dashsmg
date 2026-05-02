"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Radio, X } from "lucide-react";
import type { CatalogItem } from "@/lib/smg-storage";
import { postAcrIdentify, type AcrIdentifySummary } from "@/lib/backend-api";

function norm(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isrcLooseMatch(a: string | undefined, b: string | undefined): boolean {
  const x = (a ?? "").replace(/[-\s]/g, "").toUpperCase();
  const y = (b ?? "").replace(/[-\s]/g, "").toUpperCase();
  if (!x || !y || x === "—" || y === "—") return true;
  return x === y;
}

type Props = {
  release: CatalogItem | null;
  onClose: () => void;
};

export default function QcAcrIdentifyDialog({ release, onClose }: Props) {
  const open = Boolean(release);
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [summary, setSummary] = useState<AcrIdentifySummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const rel = release;
    const url = rel?.audioAssetUrl?.trim();
    if (!url || !rel) {
      void Promise.resolve().then(() => {
        if (cancelled) return;
        setPhase("idle");
        setSummary(null);
        setErr(null);
      });
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setPhase("loading");
      setSummary(null);
      setErr(null);
      const r = await postAcrIdentify(url, {
        releaseTitle: rel.title,
        releaseArtist: rel.artist,
      });
      if (cancelled) return;
      if (!r.ok) {
        setPhase("error");
        setErr(r.error || "Lỗi không xác định");
        return;
      }
      setSummary(r.summary ?? null);
      setPhase("done");
    })();
    return () => {
      cancelled = true;
    };
  }, [release]);

  if (!open || !release) return null;

  const url = release.audioAssetUrl?.trim() || "";
  const titleMatch =
    !summary?.matched ||
    !summary.title ||
    norm(summary.title) === norm(release.title) ||
    norm(release.title).includes(norm(summary.title)) ||
    norm(summary.title).includes(norm(release.title));
  const artistMatch =
    !summary?.matched ||
    !summary.artists?.length ||
    !release.artist ||
    summary.artists.some((a) => norm(a) === norm(release.artist) || norm(release.artist).includes(norm(a)));
  const isrcOk = !summary?.matched || isrcLooseMatch(release.isrc, summary.isrc);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 shrink-0 text-cyan-600" />
            <div>
              <h3 className="font-semibold text-slate-900">ACRCloud — kiểm tra nhạc</h3>
              <p className="text-xs text-slate-500">{release.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-sm">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-600 hover:underline"
            >
              Mở URL master <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {phase === "loading" && (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
              Đang tải mẫu và nhận diện (ACRCloud)…
            </div>
          )}

          {phase === "error" && err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-red-800">{err}</p>
          )}

          {phase === "done" && summary && (
            <>
              {!summary.matched && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                  Không khớp kho nhận diện ACRCloud (bản mới, chưa có trên catalog thương mại, mẫu không đủ, hoặc đang bật MOCK). Mã:{" "}
                  {summary.statusCode ?? "—"} — {summary.statusMsg ?? ""}
                  {summary.statusMsg?.includes("ACRCLOUD_MOCK") ? (
                    <span className="mt-2 block text-xs text-amber-950/90">
                      Để quét bản đã phát hành thật: tắt <code className="rounded bg-amber-100/80 px-1">ACRCLOUD_MOCK</code>, điền key/secret và{" "}
                      <code className="rounded bg-amber-100/80 px-1">ACRCLOUD_HOST</code> đúng project ACRCloud, restart backend. Dev có thể bật{" "}
                      <code className="rounded bg-amber-100/80 px-1">ACRCLOUD_MOCK_SYNTHETIC_HIT=1</code> để giả lập khớp theo tiêu đề/nghệ sĩ.
                    </span>
                  ) : null}
                </p>
              )}

              {summary.matched && (
                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kết quả nhận diện</p>
                  <dl className="grid gap-2 text-slate-800">
                    <div>
                      <dt className="text-xs text-slate-500">Tiêu đề</dt>
                      <dd className="font-medium">{summary.title ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Nghệ sĩ</dt>
                      <dd>{summary.artists?.length ? summary.artists.join(", ") : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Album</dt>
                      <dd>{summary.album ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">ISRC (ACR)</dt>
                      <dd className="font-mono text-xs">{summary.isrc ?? "—"}</dd>
                    </div>
                    {summary.acrScore != null && (
                      <div>
                        <dt className="text-xs text-slate-500">Điểm khớp</dt>
                        <dd>{summary.acrScore}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {summary.matched && (
                <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">So với metadata khách gửi</p>
                  <ul className="space-y-1.5 text-xs">
                    <li className={titleMatch ? "text-emerald-700" : "text-amber-800"}>
                      Tiêu đề: {titleMatch ? "✓ Khớp hoặc gần khớp" : "⚠ Khác — cần rà lại"}
                    </li>
                    <li className={artistMatch ? "text-emerald-700" : "text-amber-800"}>
                      Nghệ sĩ: {artistMatch ? "✓ Khớp hoặc gần khớp" : "⚠ Khác — cần rà lại"}
                    </li>
                    <li className={isrcOk ? "text-emerald-700" : "text-amber-800"}>
                      ISRC: {isrcOk ? "✓ Khớp hoặc chưa khai báo" : "⚠ Khác với ACR — kiểm tra quyền / master"}
                    </li>
                  </ul>
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                ACRCloud khuyến nghị đoạn ngắn (~15 giây đầu); backend chỉ gửi một phần đầu file để tối ưu. Kết quả mang tính
                tham khảo khi bản chưa có trong catalog thương mại.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
