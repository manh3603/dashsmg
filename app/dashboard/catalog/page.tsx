"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowUpDown, Trash2, X } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import type { CatalogItem, ReleaseStatus } from "@/lib/smg-storage";
import { getCatalog, removeCatalogItem } from "@/lib/smg-storage";
import { catalogItemToDisplayTable } from "@/lib/catalog-table";

const filters: { key: "all" | ReleaseStatus; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "pending_qc", label: "Chờ QC SMG" },
  { key: "sent_to_stores", label: "Đang đẩy CH" },
  { key: "pending", label: "Chờ (cũ)" },
  { key: "live", label: "Trực tiếp" },
  { key: "rejected", label: "Đã từ chối" },
  { key: "draft", label: "Bản nháp" },
];

function canEditResubmit(status: ReleaseStatus): boolean {
  return (
    status === "rejected" || status === "draft" || status === "pending_qc" || status === "pending"
  );
}

/** Xóa khỏi kho: bản lỗi / nháp / chờ QC — không cho xóa bản đã live để tránh nhầm. */
function canDeleteFromCatalog(status: ReleaseStatus): boolean {
  return status !== "live";
}

export default function CatalogPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof filters)[number]["key"]>("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [list, setList] = useState<CatalogItem[]>([]);
  const [detail, setDetail] = useState<CatalogItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);

  const reload = useCallback(() => setList(getCatalog()), []);

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

  const rows = useMemo(() => {
    let filtered = list.filter((r) => {
      const matchQ =
        r.title.toLowerCase().includes(q.toLowerCase()) ||
        (r.isrc ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (r.upc ?? "").toLowerCase().includes(q.toLowerCase());
      const matchS = statusFilter === "all" || r.status === statusFilter;
      return matchQ && matchS;
    });
    filtered = [...filtered].sort((a, b) => (sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)));
    return filtered;
  }, [list, q, statusFilter, sortAsc]);

  const detailRows = useMemo(() => (detail ? catalogItemToDisplayTable(detail) : []), [detail]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quản lý kho nhạc</h1>
        <p className="mt-1 text-slate-600">Album / Single — đồng bộ trạng thái với QC SMG và cửa hàng</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Tìm theo tên, ISRC, UPC..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none ring-cyan-500 focus:ring-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === f.key ? "bg-cyan-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <button type="button" className="inline-flex items-center gap-1 hover:text-slate-900" onClick={() => setSortAsc((s) => !s)}>
                    Sản phẩm
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Loại</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">ISRC</th>
                <th className="px-4 py-3 font-medium">UPC</th>
                <th className="px-4 py-3 font-medium">Cập nhật</th>
                <th className="px-4 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.title}</td>
                  <td className="px-4 py-3 text-slate-600">{r.type}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.isrc}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.upc}</td>
                  <td className="px-4 py-3 text-slate-500">{r.updated}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-cyan-600 hover:underline"
                        onClick={() => setDetail(r)}
                      >
                        Xem
                      </button>
                      {canEditResubmit(r.status) && (
                        <Link
                          href={`/dashboard/distribute?edit=${encodeURIComponent(r.id)}`}
                          className="text-violet-700 hover:underline"
                        >
                          Sửa &amp; gửi lại
                        </Link>
                      )}
                      {canDeleteFromCatalog(r.status) && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-red-600 hover:underline"
                          title="Xóa khỏi kho"
                          onClick={() => setDeleteTarget(r)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xóa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="p-8 text-center text-slate-500">Không có bản ghi phù hợp.</p>}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cat-detail-title">
          <button type="button" className="absolute inset-0 bg-slate-900/50" aria-label="Đóng" onClick={() => setDetail(null)} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="cat-detail-title" className="text-lg font-semibold text-slate-900">
                  Chi tiết phát hành
                </h2>
                <p className="text-sm text-slate-500">{detail.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto px-5 py-4">
              <table className="w-full border-collapse text-left text-sm">
                <tbody className="divide-y divide-slate-100">
                  {detailRows.map((row) => (
                    <tr key={row.field}>
                      <th className="w-40 py-2 pr-4 align-top font-medium text-slate-600">{row.field}</th>
                      <td className="break-all py-2 text-slate-900">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
              {canEditResubmit(detail.status) && (
                <Link
                  href={`/dashboard/distribute?edit=${encodeURIComponent(detail.id)}`}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                  onClick={() => setDetail(null)}
                >
                  Sửa &amp; gửi lại QC
                </Link>
              )}
              {canDeleteFromCatalog(detail.status) && (
                <button
                  type="button"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
                  onClick={() => {
                    setDeleteTarget(detail);
                    setDetail(null);
                  }}
                >
                  Xóa bản ghi
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-slate-900/45" aria-label="Đóng" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Xóa khỏi kho nhạc?</h3>
            <p className="mt-2 text-sm text-slate-600">
              «{deleteTarget.title}» sẽ bị gỡ (và trên backend nếu đang đồng bộ). Không hoàn tác.
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
  );
}
