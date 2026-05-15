/** Nhật ký thao tác QC — lưu cục bộ; hiển thị trên trang chủ (mới nhất ở trên). */

import { translate, type MessageKey } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/types";

export type QcActivityKind = "approve_push" | "reject" | "request_edit" | "mark_live" | "recall";

export type QcActivityEntry = {
  id: string;
  at: string;
  kind: QcActivityKind;
  releaseId: string;
  releaseTitle: string;
  detail?: string;
};

const KEY = "smg_qc_activity_log";
const MAX = 50;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("smg-storage"));
}

export function getQcActivities(): QcActivityEntry[] {
  if (typeof window === "undefined") return [];
  const list = safeParse<QcActivityEntry[]>(localStorage.getItem(KEY), []);
  if (!Array.isArray(list)) return [];
  return list
    .filter((x) => x && typeof x.id === "string" && typeof x.at === "string")
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export function appendQcActivity(params: {
  kind: QcActivityKind;
  releaseId: string;
  releaseTitle: string;
  detail?: string;
}): void {
  if (typeof window === "undefined") return;
  const entry: QcActivityEntry = {
    id: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    at: new Date().toISOString(),
    kind: params.kind,
    releaseId: params.releaseId,
    releaseTitle: params.releaseTitle.trim() || "—",
    detail: params.detail?.trim() || undefined,
  };
  const prev = getQcActivities().filter((x) => x.id !== entry.id);
  const next = [entry, ...prev].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
  emit();
}

const QC_KIND_KEYS: Record<QcActivityKind, MessageKey> = {
  approve_push: "qc.approve_push",
  reject: "qc.reject",
  request_edit: "qc.request_edit",
  mark_live: "qc.mark_live",
  recall: "qc.recall",
};

export function qcActivityKindLabel(kind: QcActivityKind, locale: Locale = "vi"): string {
  return translate(locale, QC_KIND_KEYS[kind] ?? "qc.default");
}
