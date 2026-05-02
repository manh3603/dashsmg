"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Headphones, DollarSign, Disc, Bell, ExternalLink, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { CatalogItem } from "@/lib/smg-storage";
import { getCatalog } from "@/lib/smg-storage";
import { useAccount } from "@/context/AccountContext";
import { canAccessQc } from "@/lib/permissions";
import { getQcActivities, qcActivityKindLabel, type QcActivityEntry } from "@/lib/qc-activity-log";

type Notif = { id: string; title: string; body: string; href?: string; at?: string };

function buildNotifications(catalog: CatalogItem[]): Notif[] {
  const sorted = [...catalog].sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
  const out: Notif[] = [];
  for (const r of sorted) {
    if (r.status === "pending_qc") {
      out.push({
        id: `qc-${r.id}`,
        title: "Chờ QC",
        body: `«${r.title}» đang chờ kiểm duyệt.`,
        href: "/dashboard/admin/qc",
      });
    } else if (r.status === "rejected") {
      const why = r.qcFeedback?.trim();
      out.push({
        id: `rej-${r.id}`,
        title: "Từ chối",
        body: why
          ? `«${r.title}» bị từ chối: ${why}`
          : `«${r.title}» bị từ chối — mở kho nhạc để sửa và gửi lại.`,
        href: "/dashboard/catalog",
      });
    } else if (r.status === "draft" && r.qcFeedback?.trim()) {
      out.push({
        id: `draft-${r.id}`,
        title: "Cần chỉnh sửa",
        body: `«${r.title}»: ${r.qcFeedback!.trim()}`,
        href: "/dashboard/distribute",
      });
    } else if (r.status === "sent_to_stores") {
      out.push({
        id: `push-${r.id}`,
        title: "Đang đẩy cửa hàng",
        body: `«${r.title}» đang trong luồng gửi metadata.`,
        href: "/dashboard/catalog",
      });
    } else if (r.status === "live") {
      out.push({
        id: `live-${r.id}`,
        title: "Đã live",
        body: `«${r.title}» đánh dấu live trên hệ thống.`,
        href: "/dashboard/catalog",
      });
    }
  }
  return out.slice(0, 12);
}

function formatViDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function activitiesToNotifs(entries: QcActivityEntry[]): Notif[] {
  return entries.map((e) => ({
    id: `act-${e.id}`,
    title: qcActivityKindLabel(e.kind),
    body: [
      `«${e.releaseTitle}»`,
      e.detail ? `— ${e.detail}` : null,
    ]
      .filter(Boolean)
      .join(" "),
    href: "/dashboard/admin/qc",
    at: e.at,
  }));
}

export default function DashboardOverview() {
  const { role, ready } = useAccount();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [qcActivities, setQcActivities] = useState<QcActivityEntry[]>([]);
  const [insight, setInsight] = useState<"streams" | "revenue" | "tracks" | null>(null);

  const reload = useCallback(() => {
    setCatalog(getCatalog());
    setQcActivities(getQcActivities());
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

  const showQcLog = ready && canAccessQc(role);
  const qcNotifs = useMemo(() => activitiesToNotifs(qcActivities), [qcActivities]);
  const catalogNotifs = useMemo(() => buildNotifications(catalog), [catalog]);
  /** Chỉ tài khoản QC: trên là nhật ký duyệt/từ chối (mới → cũ); dưới là trạng thái kho. */
  const notifications = useMemo(
    () => (showQcLog ? [...qcNotifs, ...catalogNotifs] : catalogNotifs),
    [showQcLog, qcNotifs, catalogNotifs]
  );

  const activeTracks = useMemo(
    () => catalog.filter((r) => r.status === "live" || r.status === "sent_to_stores").length,
    [catalog]
  );

  /** Placeholder — thay bằng API cửa hàng khi tích hợp */
  const chartData = useMemo(() => [] as { name: string; streams: number }[], []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Trang chủ</h1>
        <p className="mt-1 text-slate-600">Tổng quan từ kho phát hành; stream/doanh thu sẽ cập nhật khi cửa hàng trả báo cáo</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setInsight("streams")}
          className="flex w-full items-center rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-cyan-200 hover:shadow-md"
        >
          <div className="mr-4 rounded-full bg-cyan-100 p-3 text-cyan-600">
            <Headphones size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Tổng lượt nghe (streams)</p>
            <p className="text-2xl font-bold text-slate-400">—</p>
            <p className="mt-1 text-xs text-slate-400">Bấm xem ghi chú</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setInsight("revenue")}
          className="flex w-full items-center rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
        >
          <div className="mr-4 rounded-full bg-emerald-100 p-3 text-emerald-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Doanh thu (tháng)</p>
            <p className="text-2xl font-bold text-slate-400">—</p>
            <p className="mt-1 text-xs text-slate-400">Đồng bộ từ đối tác / báo cáo</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setInsight("tracks")}
          className="flex w-full items-center rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-violet-200 hover:shadow-md"
        >
          <div className="mr-4 rounded-full bg-violet-100 p-3 text-violet-600">
            <Disc size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Bản đang live / đẩy CH</p>
            <p className="text-2xl font-bold text-slate-900">{activeTracks}</p>
            <p className="mt-1 text-xs text-slate-500">Từ kho nhạc cục bộ</p>
          </div>
        </button>
      </div>

      {insight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog">
          <button type="button" className="absolute inset-0 bg-slate-900/45" aria-label="Đóng" onClick={() => setInsight(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex justify-between gap-2">
              <h3 className="font-semibold text-slate-900">
                {insight === "streams" && "Streams"}
                {insight === "revenue" && "Doanh thu"}
                {insight === "tracks" && "Bản nhạc hoạt động"}
              </h3>
              <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={() => setInsight(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {insight === "tracks"
                ? `Hiện có ${activeTracks} bản ở trạng thái live hoặc đang đẩy cửa hàng trong kho.`
                : "Số liệu streams và doanh thu sẽ được nối API / báo cáo từ cửa hàng (deal đối tác). Hiện chưa có feed mẫu."}
            </p>
            <Link href="/dashboard/analytics" className="mt-4 inline-block text-sm font-medium text-cyan-600 hover:underline">
              Mở trang phân tích
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Tăng trưởng luồng — 7 ngày qua</h2>
          <p className="mt-1 text-xs text-slate-500">Dữ liệu từ DSP sau khi tích hợp</p>
          <div className="mt-4 w-full min-w-0">
            {chartData.length === 0 ? (
              <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                Chưa có dữ liệu stream — biểu đồ sẽ hiển thị khi cửa hàng trả về số liệu.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                  <Line type="monotone" dataKey="streams" stroke="#0891b2" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="flex min-h-[280px] flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 shrink-0 text-cyan-600" />
            <h2 className="text-lg font-semibold text-slate-900">Thông báo</h2>
          </div>
          {showQcLog && qcNotifs.length > 0 && (
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Nhật ký duyệt / từ chối (mới nhất ở trên)</p>
          )}
          <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <li className="text-sm text-slate-500">
                {showQcLog
                  ? "Chưa có nhật ký QC. Khi bạn duyệt, từ chối hoặc yêu cầu sửa, mục sẽ xuất hiện ở đây theo thứ tự thời gian (mới → cũ). Nghệ sĩ xem thêm trạng thái kho bên dưới."
                  : "Chưa có thông báo. Các cập nhật trạng thái phát hành (chờ QC, từ chối, đẩy CH…) sẽ hiện khi có dữ liệu trong kho nhạc."}
              </li>
            ) : (
              notifications.map((n, idx) => {
                const isFirstCatalog = showQcLog && qcNotifs.length > 0 && idx === qcNotifs.length;
                return (
                  <li key={n.id}>
                    {isFirstCatalog && (
                      <p className="mb-3 border-t border-slate-200 pt-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Trạng thái kho phát hành
                      </p>
                    )}
                    <div className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      {n.at && (
                        <p className="text-[11px] tabular-nums text-slate-400">{formatViDateTime(n.at)}</p>
                      )}
                      <p className="text-xs font-medium uppercase tracking-wide text-cyan-600">{n.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                      {n.href && (
                        <Link href={n.href} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:underline">
                          Mở <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          <Link
            href="/dashboard/catalog"
            className="mt-4 flex w-full shrink-0 items-center justify-center gap-1 border-t border-slate-100 pt-4 text-sm font-medium text-cyan-600 hover:text-cyan-700"
          >
            Kho nhạc
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
