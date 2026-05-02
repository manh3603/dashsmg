"use client";

import { useCallback, useEffect, useState } from "react";
import { Radio, ShieldCheck, Trash2, X } from "lucide-react";
import RequireQcAccess from "@/components/RequireQcAccess";
import QcAcrIdentifyDialog from "@/components/QcAcrIdentifyDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchBackendHealthPayload, isBackendConfigured, pushCatalogItemToBackend } from "@/lib/backend-api";
import type { CatalogItem } from "@/lib/smg-storage";
import { getCatalog, getCatalogItemById, removeCatalogItem, updateCatalogStatus } from "@/lib/smg-storage";
import { appendQcActivity } from "@/lib/qc-activity-log";

type FeedbackKind = "reject" | "request_edit" | "recall";

export default function AdminQcPage() {
  const [rows, setRows] = useState<CatalogItem[]>([]);
  const [acrForRelease, setAcrForRelease] = useState<CatalogItem | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState<{ row: CatalogItem; kind: FeedbackKind } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);
  const [feedbackFieldError, setFeedbackFieldError] = useState<string | null>(null);
  const [feedbackSaveError, setFeedbackSaveError] = useState<string | null>(null);
  const [pageSyncWarning, setPageSyncWarning] = useState<string | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [acrProbe, setAcrProbe] = useState<{ acrOn: boolean; healthFailed: boolean }>({
    acrOn: false,
    healthFailed: false,
  });

  const reload = useCallback(() => {
    setRows(getCatalog().filter((r) => r.status === "pending_qc" || r.status === "sent_to_stores"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) reload();
    });
    const on = () => {
      queueMicrotask(() => {
        if (!cancelled) reload();
      });
    };
    window.addEventListener("smg-storage", on);
    return () => {
      cancelled = true;
      window.removeEventListener("smg-storage", on);
    };
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    if (!isBackendConfigured()) {
      void Promise.resolve().then(() => {
        if (!cancelled) setAcrProbe({ acrOn: false, healthFailed: false });
      });
      return () => {
        cancelled = true;
      };
    }
    fetchBackendHealthPayload().then((h) => {
      if (cancelled) return;
      if (h == null) setAcrProbe({ acrOn: false, healthFailed: true });
      else setAcrProbe({ acrOn: Boolean(h.acrIdentify), healthFailed: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openFeedback = (row: CatalogItem, kind: FeedbackKind) => {
    setFeedbackText("");
    setFeedbackFieldError(null);
    setFeedbackSaveError(null);
    setFeedbackOpen({ row, kind });
  };

  const syncReleaseToBackendAfterLocal = async (id: string) => {
    if (!isBackendConfigured()) return;
    const item = getCatalogItemById(id);
    if (!item) return;
    const pr = await pushCatalogItemToBackend(item);
    if (!pr.ok) {
      setPageSyncWarning(
        `Đã lưu trên trình duyệt nhưng server chưa cập nhật đầy đủ: ${pr.error ?? "lỗi không xác định"}. Hãy chạy API (vd. «npm run dev:all») hoặc kiểm tra URL backend production.`
      );
    }
  };

  const submitFeedback = async () => {
    setFeedbackFieldError(null);
    setFeedbackSaveError(null);
    if (!feedbackOpen) return;
    const t = feedbackText.trim();
    if (t.length < 3) {
      setFeedbackFieldError("Ghi lý do cho khách (tối thiểu 3 ký tự).");
      return;
    }
    const { row, kind } = feedbackOpen;
    setFeedbackSubmitting(true);
    try {
      const nextStatus = kind === "request_edit" ? "draft" : "rejected";
      const saved = updateCatalogStatus(row.id, nextStatus, { qcFeedback: t });
      if (!saved) {
        setFeedbackSaveError(
          "Không lưu được kho nhạc — có thể thiếu bản ghi, hoặc trình duyệt chặn lưu trữ (Private mode / đầy bộ nhớ). Thử tải lại trang."
        );
        return;
      }
      const actKind =
        kind === "request_edit" ? "request_edit" : kind === "recall" ? "recall" : "reject";
      appendQcActivity({
        kind: actKind,
        releaseId: row.id,
        releaseTitle: row.title,
        detail: t,
      });
      await syncReleaseToBackendAfterLocal(row.id);
      setFeedbackOpen(null);
      setFeedbackText("");
      reload();
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const feedbackTitle =
    feedbackOpen?.kind === "request_edit"
      ? "Yêu cầu chỉnh sửa"
      : feedbackOpen?.kind === "recall"
        ? "Thu hồi / lỗi cửa hàng"
        : "Từ chối phát hành";

  return (
    <RequireQcAccess>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kiểm duyệt & QC</h1>
          <p className="mt-1 text-slate-600">
            Duyệt nội bộ trước khi đẩy metadata tới các cửa hàng đã bật trong CMS — chỉnh trạng thái vòng đời phát hành.
          </p>
          {pageSyncWarning && (
            <div className="mt-4 flex flex-wrap items-start justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <span>{pageSyncWarning}</span>
              <button
                type="button"
                className="shrink-0 rounded border border-amber-400 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                onClick={() => setPageSyncWarning(null)}
              >
                Đóng
              </button>
            </div>
          )}
          {acrProbe.healthFailed && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <strong className="font-medium">Không đọc được trạng thái API.</strong> Chạy «npm run dev:all» và kiểm tra proxy{" "}
              <code className="rounded bg-red-100/80 px-1 text-xs">/smg-api/health</code>.
            </div>
          )}
          {!acrProbe.healthFailed && !acrProbe.acrOn && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <strong className="font-medium">ACRCloud chưa sẵn sàng.</strong> Trong <code className="text-xs">backend/.env</code>{" "}
              đặt <code className="rounded bg-amber-100/80 px-1 text-xs">ACRCLOUD_MOCK=1</code> (dev, không gọi API) hoặc{" "}
              <code className="rounded bg-amber-100/80 px-1 text-xs">ACRCLOUD_ACCESS_KEY</code> +{" "}
              <code className="rounded bg-amber-100/80 px-1 text-xs">ACRCLOUD_ACCESS_SECRET</code> +{" "}
              <code className="text-xs">ACRCLOUD_HOST</code> nếu cần — rồi khởi động lại backend.
            </div>
          )}
          {acrProbe.acrOn && (
            <p className="mt-3 flex items-center gap-2 text-sm text-emerald-800">
              <Radio className="h-4 w-4 shrink-0" />
              ACRCloud sẵn sàng (key thật hoặc chế độ mô phỏng) — có thể kiểm tra master từ URL.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <ShieldCheck className="h-5 w-5 text-cyan-600" />
            <h2 className="font-semibold text-slate-900">Hàng chờ</h2>
          </div>
          {rows.length === 0 ? (
            <p className="p-8 text-center text-slate-500">Không có bản phát hành cần xử lý QC.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Sản phẩm</th>
                    <th className="px-4 py-3 font-medium">Nghệ sĩ</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium">ACRCloud</th>
                    <th className="px-4 py-3 font-medium">Cửa hàng chọn</th>
                    <th className="px-4 py-3 font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.title}</div>
                        <div className="text-xs text-slate-500">{r.type}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.artist ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        {r.audioAssetUrl?.trim() && /^https?:\/\//i.test(r.audioAssetUrl.trim()) ? (
                          <button
                            type="button"
                            disabled={!isBackendConfigured()}
                            title={
                              !isBackendConfigured()
                                ? "Cần backend (npm run dev:all — API qua /smg-api)"
                                : !acrProbe.acrOn
                                  ? "ACR chưa cấu hình — vẫn có thể thử; xem cảnh báo phía trên"
                                  : "Nhận diện qua ACRCloud (mẫu đầu file từ URL master)"
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-900 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => setAcrForRelease(r)}
                          >
                            <Radio className="h-3.5 w-3.5" />
                            Kiểm tra nhạc
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Chưa có URL master</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {(r.storesSelected ?? []).length ? r.storesSelected!.join(", ") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {r.status === "pending_qc" && (
                            <>
                              <button
                                type="button"
                                className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-700"
                                onClick={() => {
                                  if (!updateCatalogStatus(r.id, "sent_to_stores", { qcFeedback: null })) {
                                    setPageSyncWarning("Không cập nhật được kho nhạc cục bộ.");
                                    return;
                                  }
                                  appendQcActivity({
                                    kind: "approve_push",
                                    releaseId: r.id,
                                    releaseTitle: r.title,
                                  });
                                  void syncReleaseToBackendAfterLocal(r.id);
                                  reload();
                                }}
                              >
                                Duyệt → đẩy cửa hàng
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100"
                                onClick={() => openFeedback(r, "reject")}
                              >
                                Từ chối
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() => openFeedback(r, "request_edit")}
                              >
                                Yêu cầu chỉnh sửa
                              </button>
                            </>
                          )}
                          {r.status === "sent_to_stores" && (
                            <>
                              <button
                                type="button"
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                                onClick={() => {
                                  if (!updateCatalogStatus(r.id, "live", { qcFeedback: null })) {
                                    setPageSyncWarning("Không cập nhật được kho nhạc cục bộ.");
                                    return;
                                  }
                                  appendQcActivity({
                                    kind: "mark_live",
                                    releaseId: r.id,
                                    releaseTitle: r.title,
                                  });
                                  void syncReleaseToBackendAfterLocal(r.id);
                                  reload();
                                }}
                              >
                                Đánh dấu live (cửa hàng đã nhận)
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                                onClick={() => openFeedback(r, "recall")}
                              >
                                Thu hồi / lỗi
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            title="Xóa bản phát hành lỗi khỏi kho"
                            onClick={() => setDeleteTarget(r)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <QcAcrIdentifyDialog release={acrForRelease} onClose={() => setAcrForRelease(null)} />

        {feedbackOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/45"
              aria-label="Đóng"
              onClick={() => setFeedbackOpen(null)}
            />
            <div
              className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
              onMouseDown={(e) => e.stopPropagation()}
              role="document"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void submitFeedback();
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">{feedbackTitle}</h3>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-500 hover:bg-slate-100"
                    onClick={() => setFeedbackOpen(null)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Ghi rõ lý do để khách hàng chỉnh sửa đúng hướng. Nội dung hiển thị trong kho nhạc và màn hình phát hành khi sửa
                  lại.
                </p>
                {(feedbackFieldError || feedbackSaveError) && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                    {feedbackSaveError ?? feedbackFieldError}
                  </p>
                )}
                <textarea
                  className="mt-4 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                  placeholder="Ví dụ: Ảnh bìa độ phân giải thấp; ISRC không khớp hợp đồng; metadata nghệ sĩ sai…"
                  value={feedbackText}
                  onChange={(e) => {
                    setFeedbackText(e.target.value);
                    setFeedbackFieldError(null);
                    setFeedbackSaveError(null);
                  }}
                  disabled={feedbackSubmitting}
                />
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    disabled={feedbackSubmitting}
                    onClick={() => setFeedbackOpen(null)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    disabled={feedbackSubmitting}
                  >
                    {feedbackSubmitting ? "Đang lưu…" : "Gửi cho khách"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <button type="button" className="absolute inset-0 bg-slate-900/45" aria-label="Đóng" onClick={() => setDeleteTarget(null)} />
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">Xóa phát hành?</h3>
              <p className="mt-2 text-sm text-slate-600">
                «{deleteTarget.title}» sẽ bị gỡ khỏi kho (và backend nếu đang đồng bộ). Thao tác không hoàn tác.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setDeleteTarget(null)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  onClick={() => {
                    removeCatalogItem(deleteTarget.id);
                    setDeleteTarget(null);
                    reload();
                  }}
                >
                  Xóa vĩnh viễn
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireQcAccess>
  );
}
