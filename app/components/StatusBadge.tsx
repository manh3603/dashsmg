"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { PageMessageKey } from "@/lib/i18n/page-messages";
import type { ReleaseStatus } from "@/lib/smg-storage";

const styles: Record<ReleaseStatus, string> = {
  live: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  pending: "bg-amber-100 text-amber-900 ring-amber-600/20",
  pending_qc: "bg-amber-100 text-amber-950 ring-amber-600/30",
  rejected: "bg-red-100 text-red-800 ring-red-600/20",
  sent_to_stores: "bg-sky-100 text-sky-900 ring-sky-600/20",
  takedown: "bg-zinc-800 text-zinc-100 ring-zinc-600/30",
  draft: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

const STATUS_KEYS: Record<ReleaseStatus, PageMessageKey> = {
  live: "status.live",
  pending: "status.pending",
  pending_qc: "status.pending_qc",
  rejected: "status.rejected",
  sent_to_stores: "status.sent_to_stores",
  takedown: "status.takedown",
  draft: "status.draft",
};

export function StatusBadge({ status }: { status: ReleaseStatus }) {
  const { t } = useLanguage();
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}>
      {t(STATUS_KEYS[status])}
    </span>
  );
}
