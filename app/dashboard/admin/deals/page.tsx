"use client";

import { useCallback, useEffect, useState } from "react";
import { Handshake, Plus, RefreshCw, Trash2 } from "lucide-react";
import RequirePlatformAdmin from "@/components/RequirePlatformAdmin";
import { useLanguage } from "@/context/LanguageContext";
import { getApiSessionToken } from "@/lib/smg-storage";
import {
  isBackendConfigured,
  postAdminDealDelete,
  postAdminDealsList,
  postAdminDealUpsert,
  type PartnerDealRow,
} from "@/lib/backend-api";
import {
  CIS_AGGREGATOR_STORE_IDS,
  dealDraftForCisStore,
  parseSftpCredentials,
  SP_DIGITAL_SFTP_DEFAULTS,
} from "@/lib/partner-deal-sftp";
import { CIS_STORE_LABELS, isCisStoreId, type CisStoreId } from "@/lib/cis-stores";

export default function AdminPartnerDealsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<PartnerDealRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cisStoreId, setCisStoreId] = useState<CisStoreId>("vk_music");
  const [sftpHost, setSftpHost] = useState(SP_DIGITAL_SFTP_DEFAULTS.host);
  const [sftpHostFallback, setSftpHostFallback] = useState(SP_DIGITAL_SFTP_DEFAULTS.hostFallback);
  const [sftpUser, setSftpUser] = useState(SP_DIGITAL_SFTP_DEFAULTS.user);
  const [sftpPassword, setSftpPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<PartnerDealRow["status"]>("active");

  const statusOpts: { value: PartnerDealRow["status"]; labelKey: "deals.status.draft" | "deals.status.active" | "deals.status.archived" }[] = [
    { value: "draft", labelKey: "deals.status.draft" },
    { value: "active", labelKey: "deals.status.active" },
    { value: "archived", labelKey: "deals.status.archived" },
  ];

  const reload = useCallback(async () => {
    setErr(null);
    if (!isBackendConfigured()) {
      setErr(t("deals.err.noApi"));
      setRows([]);
      return;
    }
    const token = getApiSessionToken();
    if (!token) {
      setErr(t("deals.err.noSession"));
      setRows([]);
      return;
    }
    const r = await postAdminDealsList(token);
    if (!r.ok) {
      setErr(r.error);
      setRows([]);
      return;
    }
    setRows(r.deals);
  }, [t]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void reload();
    });
    return () => cancelAnimationFrame(id);
  }, [reload]);

  const resetForm = () => {
    setEditingId(null);
    setCisStoreId("vk_music");
    setSftpHost(SP_DIGITAL_SFTP_DEFAULTS.host);
    setSftpHostFallback(SP_DIGITAL_SFTP_DEFAULTS.hostFallback);
    setSftpUser(SP_DIGITAL_SFTP_DEFAULTS.user);
    setSftpPassword("");
    setNotes("");
    setStatus("active");
  };

  const loadRow = (d: PartnerDealRow) => {
    const store = d.deliveryCisStoreKeys?.[0];
    if (store && isCisStoreId(store)) setCisStoreId(store);
    const creds = parseSftpCredentials(d.deliverySftpTargetsJson);
    setEditingId(d.id);
    setSftpHost(creds.host || SP_DIGITAL_SFTP_DEFAULTS.host);
    setSftpHostFallback(creds.hostFallback || SP_DIGITAL_SFTP_DEFAULTS.hostFallback);
    setSftpUser(creds.user || SP_DIGITAL_SFTP_DEFAULTS.user);
    setSftpPassword(creds.password);
    setNotes(d.notes ?? "");
    setStatus(d.status);
  };

  const buildPayload = () => {
    let password = sftpPassword.trim();
    if (!password && editingId) {
      const prev = rows.find((r) => r.id === editingId);
      password = parseSftpCredentials(prev?.deliverySftpTargetsJson).password;
    }
    if (!password) return null;
    const draft = dealDraftForCisStore(
      cisStoreId,
      {
        host: sftpHost,
        hostFallback: sftpHostFallback,
        port: SP_DIGITAL_SFTP_DEFAULTS.port,
        user: sftpUser,
        password,
        remoteDir: SP_DIGITAL_SFTP_DEFAULTS.remoteDir,
      },
      { contractRef: SP_DIGITAL_SFTP_DEFAULTS.contractRef, notes }
    );
    return {
      id: editingId ?? `cis-${cisStoreId}`,
      ...draft,
    };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getApiSessionToken();
    const payload = buildPayload();
    if (!token || !payload) {
      setErr(t("deals.err.needPassword"));
      return;
    }
    setSaving(true);
    const r = await postAdminDealUpsert(token, payload);
    setSaving(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setRows(r.deals);
    resetForm();
    setErr(null);
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("deals.confirmDelete"))) return;
    const token = getApiSessionToken();
    if (!token) return;
    setSaving(true);
    const r = await postAdminDealDelete(token, id);
    setSaving(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setRows(r.deals);
    if (editingId === id) resetForm();
    setErr(null);
  };

  return (
    <RequirePlatformAdmin>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("deals.title")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("deals.subtitle")}</p>
            <p className="mt-2 text-xs text-slate-500">{t("deals.sftp.seedHint")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void reload()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
              {t("common.reload")}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100"
            >
              <Plus className="h-4 w-4" />
              {t("deals.newDeal")}
            </button>
          </div>
        </div>

        {err && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            {err}
          </p>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Handshake className="h-5 w-5 text-violet-600" />
            {editingId ? t("common.edit") : t("deals.addDeal")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{t("deals.sftp.oneStoreHint")}</p>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => void submit(e)}>
            <div>
              <label className="text-xs font-medium text-slate-600">{t("deals.sftp.store")} *</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                value={cisStoreId}
                onChange={(e) => setCisStoreId(e.target.value as CisStoreId)}
                disabled={Boolean(editingId)}
              >
                {CIS_AGGREGATOR_STORE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {CIS_STORE_LABELS[id].name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">{t("deals.statusLabel")}</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                value={status}
                onChange={(e) => setStatus(e.target.value as PartnerDealRow["status"])}
              >
                {statusOpts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">{t("deals.sftp.host")} *</label>
              <input
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900"
                value={sftpHost}
                onChange={(e) => setSftpHost(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">{t("deals.sftp.hostFallback")}</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900"
                value={sftpHostFallback}
                onChange={(e) => setSftpHostFallback(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">{t("deals.sftp.login")} *</label>
              <input
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900"
                value={sftpUser}
                onChange={(e) => setSftpUser(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">{t("deals.sftp.password")} *</label>
              <input
                type="password"
                required={!editingId}
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900"
                value={sftpPassword}
                onChange={(e) => setSftpPassword(e.target.value)}
                placeholder={editingId ? t("deals.sftp.passwordKeep") : ""}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">{t("deals.notes")}</label>
              <textarea
                className="mt-1 min-h-[60px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving || !getApiSessionToken()}
                className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50"
              >
                {saving ? t("common.saving") : t("deals.save")}
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t("deals.table.partner")}</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t("deals.sftp.store")}</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t("deals.sftp.host")}</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t("deals.statusLabel")}</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((d) => {
                const creds = parseSftpCredentials(d.deliverySftpTargetsJson);
                return (
                  <tr key={d.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{d.partnerName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {(d.deliveryCisStoreKeys ?? []).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{creds.host || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {statusOpts.find((s) => s.value === d.status) ? t(statusOpts.find((s) => s.value === d.status)!.labelKey) : d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => loadRow(d)}
                        className="mr-1 rounded-lg px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50"
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(d.id)}
                        className="inline-flex rounded-lg p-2 text-red-600 hover:bg-red-50"
                        title={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && !err && (
            <p className="p-6 text-center text-sm text-slate-500">{t("deals.empty")}</p>
          )}
        </div>
      </div>
    </RequirePlatformAdmin>
  );
}
