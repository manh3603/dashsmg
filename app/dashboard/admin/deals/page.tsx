"use client";

import { useCallback, useEffect, useState } from "react";
import { Handshake, Plus, RefreshCw, Trash2 } from "lucide-react";
import RequirePlatformAdmin from "@/components/RequirePlatformAdmin";
import { getApiSessionToken } from "@/lib/smg-storage";
import {
  isBackendConfigured,
  postAdminDealDelete,
  postAdminDealsList,
  postAdminDealUpsert,
  type PartnerDealRow,
} from "@/lib/backend-api";

const STATUS_OPTS: { value: PartnerDealRow["status"]; label: string }[] = [
  { value: "draft", label: "Nháp" },
  { value: "active", label: "Đang hiệu lực" },
  { value: "archived", label: "Lưu trữ" },
];

export default function AdminPartnerDealsPage() {
  const [rows, setRows] = useState<PartnerDealRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [contractRef, setContractRef] = useState("");
  const [territory, setTerritory] = useState("");
  const [revenueTerms, setRevenueTerms] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [reportingStores, setReportingStores] = useState("");
  const [status, setStatus] = useState<PartnerDealRow["status"]>("draft");

  const reload = useCallback(async () => {
    setErr(null);
    if (!isBackendConfigured()) {
      setErr("Chưa cấu hình API.");
      setRows([]);
      return;
    }
    const t = getApiSessionToken();
    if (!t) {
      setErr("Thiếu phiên API — đăng xuất và đăng nhập lại.");
      setRows([]);
      return;
    }
    const r = await postAdminDealsList(t);
    if (!r.ok) {
      setErr(r.error);
      setRows([]);
      return;
    }
    setRows(r.deals);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void reload();
    });
    return () => cancelAnimationFrame(id);
  }, [reload]);

  const resetForm = () => {
    setEditingId(null);
    setPartnerName("");
    setContractRef("");
    setTerritory("");
    setRevenueTerms("");
    setValidFrom("");
    setValidTo("");
    setContactEmail("");
    setNotes("");
    setReportingStores("");
    setStatus("draft");
  };

  const loadRow = (d: PartnerDealRow) => {
    setEditingId(d.id);
    setPartnerName(d.partnerName);
    setContractRef(d.contractRef ?? "");
    setTerritory(d.territory ?? "");
    setRevenueTerms(d.revenueTerms ?? "");
    setValidFrom(d.validFrom ?? "");
    setValidTo(d.validTo ?? "");
    setContactEmail(d.contactEmail ?? "");
    setNotes(d.notes ?? "");
    setReportingStores(d.reportingStores ?? "");
    setStatus(d.status);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = getApiSessionToken();
    if (!t || !partnerName.trim()) return;
    setSaving(true);
    const r = await postAdminDealUpsert(t, {
      id: editingId ?? undefined,
      partnerName: partnerName.trim(),
      contractRef: contractRef.trim() || undefined,
      territory: territory.trim() || undefined,
      revenueTerms: revenueTerms.trim() || undefined,
      validFrom: validFrom.trim() || undefined,
      validTo: validTo.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      notes: notes.trim() || undefined,
      reportingStores: reportingStores.trim() || undefined,
      status,
    });
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
    if (!window.confirm("Xóa deal này?")) return;
    const t = getApiSessionToken();
    if (!t) return;
    setSaving(true);
    const r = await postAdminDealDelete(t, id);
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
            <h1 className="text-2xl font-bold text-slate-900">Deal đối tác</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Ghi nhận hợp đồng phân phối, lãnh thổ, điều khoản doanh thu và liên hệ — lưu trên máy chủ (
              <code className="rounded bg-slate-100 px-1 text-xs">backend/data/partner-deals.json</code>). Trường «Cửa hàng báo cáo» gắn từng deal với kênh ingest phân tích (nhiều deal = nhiều nguồn số liệu).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void reload()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
              Tải lại
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100"
            >
              <Plus className="h-4 w-4" />
              Deal mới
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
            {editingId ? "Sửa deal" : "Thêm deal"}
          </h2>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => void submit(e)}>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Tên đối tác / DSP *</label>
              <input
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="Ví dụ: Zing MP3, VK Music…"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Số hợp đồng / tham chiếu</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                value={contractRef}
                onChange={(e) => setContractRef(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Lãnh thổ</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                value={territory}
                onChange={(e) => setTerritory(e.target.value)}
                placeholder="CIS, VN, Worldwide…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Cửa hàng / kênh báo cáo (CSV)</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={reportingStores}
                onChange={(e) => setReportingStores(e.target.value)}
                placeholder="Ví dụ: Zing MP3, Spotify, Apple Music — dùng cho phân tích đa deal"
              />
              <p className="mt-1 text-xs text-slate-500">Mỗi deal có thể map một hoặc nhiều tên kênh; backend gộp tag từ mọi deal đang «Đang hiệu lực».</p>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Điều khoản doanh thu / phí</label>
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={revenueTerms}
                onChange={(e) => setRevenueTerms(e.target.value)}
                placeholder="Ví dụ: 85% net cho nghệ sĩ sau phí nền tảng…"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Hiệu lực từ</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Hiệu lực đến</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Email liên hệ</label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Trạng thái</label>
              <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" value={status} onChange={(e) => setStatus(e.target.value as PartnerDealRow["status"])}>
                {STATUS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Ghi chú</label>
              <textarea className="mt-1 min-h-[60px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving || !getApiSessionToken()}
                className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50"
              >
                {saving ? "Đang lưu…" : editingId ? "Cập nhật" : "Lưu deal"}
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Đối tác</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Hợp đồng</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Lãnh thổ</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Báo cáo</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Trạng thái</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{d.partnerName}</td>
                  <td className="px-4 py-3 text-slate-600">{d.contractRef ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{d.territory ?? "—"}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-slate-600" title={d.reportingStores ?? ""}>
                    {d.reportingStores?.trim() ? d.reportingStores : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{STATUS_OPTS.find((s) => s.value === d.status)?.label ?? d.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => loadRow(d)} className="mr-1 rounded-lg px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50">
                      Sửa
                    </button>
                    <button type="button" onClick={() => void remove(d.id)} className="inline-flex rounded-lg p-2 text-red-600 hover:bg-red-50" title="Xóa">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !err && <p className="p-6 text-center text-sm text-slate-500">Chưa có deal — thêm bản ghi đầu tiên ở form trên.</p>}
        </div>
      </div>
    </RequirePlatformAdmin>
  );
}
