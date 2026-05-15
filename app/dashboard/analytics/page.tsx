"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import RequireFinancialAccess from "@/components/RequireFinancialAccess";
import { useLanguage } from "@/context/LanguageContext";
import { isBackendConfigured, postAnalyticsReport, type AnalyticsReportPayload } from "@/lib/backend-api";
import { getApiSessionToken } from "@/lib/smg-storage";

function formatStreams(n: number): string {
  return n.toLocaleString("vi-VN");
}

function tablePlaceholder(report: AnalyticsReportPayload | null): string {
  if (!report) return "Đang khởi tạo…";
  if (!report.configured) {
    return "Chưa cấu hình API đối tác (backend: ANALYTICS_PARTNER_REPORT_URL). Để xem bảng mẫu khi dev, đặt ANALYTICS_REPORT_MOCK=1 trong backend/.env và khởi động lại API.";
  }
  if (!report.fetchOk) {
    return `Không tải được dữ liệu: ${report.error ?? "Lỗi không xác định"}`;
  }
  return "API đã trả về nhưng không có dòng cửa hàng — kiểm tra JSON (mảng byStore / stores với streams hoặc streamCount).";
}

function AnalyticsPageContent() {
  const { t } = useLanguage();
  const [noBackend, setNoBackend] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [busy, setBusy] = useState(true);
  const [report, setReport] = useState<AnalyticsReportPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isBackendConfigured()) {
      queueMicrotask(() => {
        if (cancelled) return;
        setNoBackend(true);
        setBusy(false);
      });
      return () => {
        cancelled = true;
      };
    }
    const tok = getApiSessionToken();
    if (!tok) {
      queueMicrotask(() => {
        if (cancelled) return;
        setNeedLogin(true);
        setBusy(false);
      });
      return () => {
        cancelled = true;
      };
    }
    queueMicrotask(() => {
      if (!cancelled) setBusy(true);
    });
    void postAnalyticsReport(tok).then((r) => {
      if (cancelled) return;
      queueMicrotask(() => {
        if (cancelled) return;
        setBusy(false);
        if (!r.ok) {
          setLoadError(r.error);
          setReport(null);
          return;
        }
        setLoadError(null);
        setReport(r.data);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasRows = Boolean(report?.fetchOk && report.stores.length > 0);

  const chartData = useMemo(() => {
    if (!hasRows || !report) return [];
    return [...report.stores]
      .sort((a, b) => b.streams - a.streams)
      .map((s) => ({
        storeName: s.storeName.length > 28 ? `${s.storeName.slice(0, 26)}…` : s.storeName,
        streams: s.streams,
        fullName: s.storeName,
      }));
  }, [report, hasRows]);

  const chartHeight = useMemo(() => Math.min(520, Math.max(260, chartData.length * 44 + 120)), [chartData.length]);

  const totalStreams = useMemo(() => {
    if (!report?.stores.length) return 0;
    return report.stores.reduce((s, x) => s + x.streams, 0);
  }, [report]);

  if (noBackend) {
    return (
      <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h1 className="text-2xl font-bold">{t("nav.analytics")}</h1>
        <p className="text-sm">
          Chưa cấu hình API — đặt <code className="rounded bg-amber-100 px-1 text-xs">NEXT_PUBLIC_BACKEND_URL</code> hoặc chạy{" "}
          <code className="rounded bg-amber-100 px-1 text-xs">npm run dev:all</code>.
        </p>
      </div>
    );
  }

  if (needLogin) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{t("nav.analytics")}</h1>
        <p className="text-sm text-slate-600">Đăng nhập lại để tải báo cáo stream từ đối tác.</p>
        <Link href="/login" className="inline-block text-sm font-medium text-violet-600 hover:underline">
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (busy) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("nav.analytics")}</h1>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Cửa hàng</th>
                <th className="px-4 py-3 text-right font-medium">Stream</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={2} className="px-4 py-10 text-center text-slate-500">
                  <span className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent align-middle" aria-hidden />
                  {t("analytics.loading")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("nav.analytics")}</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{loadError}</div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Cửa hàng</th>
                <th className="px-4 py-3 text-right font-medium">Stream</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-slate-600">
                  Không có dữ liệu — sửa lỗi ở trên rồi tải lại trang.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("nav.analytics")}</h1>
          <p className="mt-1 text-sm text-slate-600">{t("analytics.subtitle")}</p>
        </div>
        {report?.asOf ? (
          <p className="text-xs text-slate-500">
            Cập nhật: <span className="font-mono text-slate-700">{report.asOf}</span>
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-600">{t("analytics.totalStreams")}</p>
        <p className="mt-1 text-2xl font-bold text-violet-900 sm:text-3xl">{hasRows ? formatStreams(totalStreams) : "—"}</p>
      </div>

      {hasRows ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">{t("analytics.chart.title")}</h2>
          <div className="mt-4 w-full" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => formatStreams(Number(v))} className="text-xs" stroke="#64748b" />
                <YAxis type="category" dataKey="storeName" width={132} tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip
                  formatter={(value) => [formatStreams(Number(value)), "Stream"]}
                  labelFormatter={(_, i) => (typeof i === "number" ? chartData[i]?.fullName ?? "" : "")}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="streams" fill="#7c3aed" radius={[0, 6, 6, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
          <h2 className="text-sm font-semibold text-slate-800">Bảng analytics — stream theo cửa hàng</h2>
        </div>
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Cửa hàng</th>
              <th className="px-4 py-3 text-right font-medium">Stream</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hasRows && report
              ? [...report.stores]
                  .sort((a, b) => b.streams - a.streams)
                  .map((s) => (
                    <tr key={`${s.storeName}-${s.storeKey ?? ""}`} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">{s.storeName}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">{formatStreams(s.streams)}</td>
                    </tr>
                  ))
              : null}
            {!hasRows ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-sm leading-relaxed text-slate-600">
                  {tablePlaceholder(report)}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <RequireFinancialAccess>
      <AnalyticsPageContent />
    </RequireFinancialAccess>
  );
}
