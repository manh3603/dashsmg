"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Headphones, DollarSign, Disc, Bell, ExternalLink, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { CatalogItem } from "@/lib/smg-storage";
import { getCatalog } from "@/lib/smg-storage";
import { useAccount } from "@/context/AccountContext";
import { useLanguage } from "@/context/LanguageContext";
import type { MessageKey } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/types";
import { translate } from "@/lib/i18n/messages";
import { canAccessQc } from "@/lib/permissions";
import { getQcActivities, qcActivityKindLabel, type QcActivityEntry } from "@/lib/qc-activity-log";

type Notif = { id: string; title: string; body: string; href?: string; at?: string };

function buildNotifications(catalog: CatalogItem[], locale: Locale): Notif[] {
  const t = (key: MessageKey, vars?: Record<string, string>) => translate(locale, key, vars);
  const sorted = [...catalog].sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
  const out: Notif[] = [];
  for (const r of sorted) {
    const title = r.title;
    if (r.status === "pending_qc") {
      out.push({
        id: `qc-${r.id}`,
        title: t("notif.pending_qc.title"),
        body: t("notif.pending_qc.body", { title }),
        href: "/dashboard/admin/qc",
      });
    } else if (r.status === "rejected") {
      const why = r.qcFeedback?.trim();
      out.push({
        id: `rej-${r.id}`,
        title: t("notif.rejected.title"),
        body: why
          ? t("notif.rejected.bodyWhy", { title, why })
          : t("notif.rejected.body", { title }),
        href: "/dashboard/catalog",
      });
    } else if (r.status === "draft" && r.qcFeedback?.trim()) {
      out.push({
        id: `draft-${r.id}`,
        title: t("notif.draft.title"),
        body: t("notif.draft.body", { title, why: r.qcFeedback!.trim() }),
        href: "/dashboard/distribute",
      });
    } else if (r.status === "sent_to_stores") {
      out.push({
        id: `push-${r.id}`,
        title: t("notif.sent.title"),
        body: t("notif.sent.body", { title }),
        href: "/dashboard/catalog",
      });
    } else if (r.status === "takedown") {
      const note = r.qcFeedback?.trim();
      out.push({
        id: `td-${r.id}`,
        title: t("notif.takedown.title"),
        body: note
          ? t("notif.takedown.bodyNote", { title, note })
          : t("notif.takedown.body", { title }),
        href: "/dashboard/catalog",
      });
    } else if (r.status === "live") {
      out.push({
        id: `live-${r.id}`,
        title: t("notif.live.title"),
        body: t("notif.live.body", { title }),
        href: "/dashboard/catalog",
      });
    }
  }
  return out.slice(0, 12);
}

function formatDateTime(iso: string, locale: Locale): string {
  const tag = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "vi-VN";
  try {
    return new Date(iso).toLocaleString(tag, {
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

function activitiesToNotifs(entries: QcActivityEntry[], locale: Locale): Notif[] {
  return entries.map((e) => ({
    id: `act-${e.id}`,
    title: qcActivityKindLabel(e.kind, locale),
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
  const { locale, t } = useLanguage();
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
  const qcNotifs = useMemo(() => activitiesToNotifs(qcActivities, locale), [qcActivities, locale]);
  const catalogNotifs = useMemo(() => buildNotifications(catalog, locale), [catalog, locale]);
  const notifications = useMemo(
    () => (showQcLog ? [...qcNotifs, ...catalogNotifs] : catalogNotifs),
    [showQcLog, qcNotifs, catalogNotifs]
  );

  const activeTracks = useMemo(
    () => catalog.filter((r) => r.status === "live" || r.status === "sent_to_stores").length,
    [catalog]
  );

  const chartData = useMemo(() => [] as { name: string; streams: number }[], []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("home.title")}</h1>
        <p className="mt-1 text-slate-600">{t("home.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setInsight("streams")}
          className="flex w-full items-center rounded-xl border border-slate-200 bg-white/90 p-6 text-left shadow-sm backdrop-blur-sm transition hover:border-violet-200 hover:shadow-md"
        >
          <div className="mr-4 rounded-full bg-violet-100 p-3 text-violet-600">
            <Headphones size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t("home.streams.label")}</p>
            <p className="text-2xl font-bold text-slate-400">—</p>
            <p className="mt-1 text-xs text-slate-400">{t("home.streams.clickHint")}</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setInsight("revenue")}
          className="flex w-full items-center rounded-xl border border-slate-200 bg-white/90 p-6 text-left shadow-sm backdrop-blur-sm transition hover:border-emerald-200 hover:shadow-md"
        >
          <div className="mr-4 rounded-full bg-emerald-100 p-3 text-emerald-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t("home.revenue.label")}</p>
            <p className="text-2xl font-bold text-slate-400">—</p>
            <p className="mt-1 text-xs text-slate-400">{t("home.revenue.hint")}</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setInsight("tracks")}
          className="flex w-full items-center rounded-xl border border-slate-200 bg-white/90 p-6 text-left shadow-sm backdrop-blur-sm transition hover:border-fuchsia-200 hover:shadow-md"
        >
          <div className="mr-4 rounded-full bg-violet-100 p-3 text-violet-600">
            <Disc size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t("home.tracks.label")}</p>
            <p className="text-2xl font-bold text-slate-900">{activeTracks}</p>
            <p className="mt-1 text-xs text-slate-500">{t("home.tracks.fromCatalog")}</p>
          </div>
        </button>
      </div>

      {insight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45"
            aria-label={t("home.modal.close")}
            onClick={() => setInsight(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex justify-between gap-2">
              <h3 className="font-semibold text-slate-900">
                {insight === "streams" && t("home.modal.streams")}
                {insight === "revenue" && t("home.modal.revenue")}
                {insight === "tracks" && t("home.modal.tracks")}
              </h3>
              <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={() => setInsight(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {insight === "tracks"
                ? t("home.modal.tracksBody", { count: activeTracks })
                : t("home.modal.metricsBody")}
            </p>
            <Link href="/dashboard/analytics" className="mt-4 inline-block text-sm font-medium text-violet-600 hover:underline">
              {t("home.modal.openAnalytics")}
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
        <div className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">{t("home.chart.title")}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("home.chart.subtitle")}</p>
          <div className="mt-4 w-full min-w-0">
            {chartData.length === 0 ? (
              <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                {t("home.chart.empty")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                  <Line type="monotone" dataKey="streams" stroke="#7c3aed" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="flex min-h-[280px] flex-col rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 shrink-0 text-violet-600" />
            <h2 className="text-lg font-semibold text-slate-900">{t("home.notifications.title")}</h2>
          </div>
          {showQcLog && qcNotifs.length > 0 && (
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{t("home.notifications.qcLogHeader")}</p>
          )}
          <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <li className="text-sm text-slate-500">
                {showQcLog ? t("home.notifications.emptyQc") : t("home.notifications.empty")}
              </li>
            ) : (
              notifications.map((n, idx) => {
                const isFirstCatalog = showQcLog && qcNotifs.length > 0 && idx === qcNotifs.length;
                return (
                  <li key={n.id}>
                    {isFirstCatalog && (
                      <p className="mb-3 border-t border-slate-200 pt-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                        {t("home.notifications.catalogHeader")}
                      </p>
                    )}
                    <div className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      {n.at && (
                        <p className="text-[11px] tabular-nums text-slate-400">{formatDateTime(n.at, locale)}</p>
                      )}
                      <p className="text-xs font-medium uppercase tracking-wide text-violet-600">{n.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                      {n.href && (
                        <Link href={n.href} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:underline">
                          {t("home.notifications.open")} <ExternalLink className="h-3 w-3" />
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
            className="mt-4 flex w-full shrink-0 items-center justify-center gap-1 border-t border-slate-100 pt-4 text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            {t("home.notifications.catalogLink")}
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

