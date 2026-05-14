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
import { CIS_STORE_IDS, CIS_STORE_LABELS, type CisStoreId } from "@/lib/cis-stores";

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
  const [deliveryCisStoreKeys, setDeliveryCisStoreKeys] = useState<string[]>([]);
  const [deliverySftpTargetsJson, setDeliverySftpTargetsJson] = useState("");
  const [analyticsReportUrl, setAnalyticsReportUrl] = useState("");
  const [analyticsReportMethod, setAnalyticsReportMethod] = useState<"GET" | "POST">("GET");
  const [analyticsReportBearer, setAnalyticsReportBearer] = useState("");
  const [analyticsReportAuthHeader, setAnalyticsReportAuthHeader] = useState("");
  const [analyticsReportAuthValue, setAnalyticsReportAuthValue] = useState("");
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
    setDeliveryCisStoreKeys([]);
    setDeliverySftpTargetsJson("");
    setAnalyticsReportUrl("");
    setAnalyticsReportMethod("GET");
    setAnalyticsReportBearer("");
    setAnalyticsReportAuthHeader("");
    setAnalyticsReportAuthValue("");
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
    setDeliveryCisStoreKeys(Array.isArray(d.deliveryCisStoreKeys) ? [...d.deliveryCisStoreKeys] : []);
    setDeliverySftpTargetsJson(d.deliverySftpTargetsJson ?? "");
    setAnalyticsReportUrl(d.analyticsReportUrl ?? "");
    setAnalyticsReportMethod(d.analyticsReportMethod === "POST" ? "POST" : "GET");
    setAnalyticsReportBearer(d.analyticsReportBearer ?? "");
    setAnalyticsReportAuthHeader(d.analyticsReportAuthHeader ?? "");
    setAnalyticsReportAuthValue(d.analyticsReportAuthValue ?? "");
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
      deliveryCisStoreKeys: deliveryCisStoreKeys.length ? deliveryCisStoreKeys : [],
      deliverySftpTargetsJson: deliverySftpTargetsJson.trim() || undefined,
      analyticsReportUrl: analyticsReportUrl.trim() || undefined,
      analyticsReportMethod: analyticsReportMethod,
      analyticsReportBearer: analyticsReportBearer.trim() || undefined,
      analyticsReportAuthHeader: analyticsReportAuthHeader.trim() || undefined,
      analyticsReportAuthValue: analyticsReportAuthValue.trim() || undefined,
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
              <code className="rounded bg-slate-100 px-1 text-xs">backend/data/partner-deals.json</code>). Deal{" "}
              <strong>Đang hiệu lực</strong> có thể gắn cửa hàng CIS (gộp khi QC đẩy DDEX), kèm JSON SFTP (merge với env) và URL API báo cáo stream; «Cửa hàng báo cáo» (CSV) gắn tag phân tích.
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
            <div className="sm:col-span-2 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
              <h3 className="text-sm font-semibold text-emerald-900">Cửa hàng giao DDEX (CIS) — theo hợp đồng</h3>
              <p className="mt-1 text-xs text-slate-600">
                Khi deal ở trạng thái <strong>Đang hiệu lực</strong>, backend <strong>cộng</strong> các mã cửa hàng đã tick vào danh sách nghệ sĩ chọn khi build ERN / gửi HTTP+SFTP (sau QC). Endpoint thật vẫn cấu hình trên server (
                <code className="rounded bg-white px-1 text-[10px]">CIS_DELIVERY_*_URL</code>
                ). Nên bật cửa hàng tương ứng trong{" "}
                <a href="/dashboard/admin/stores" className="font-medium text-emerald-800 underline">
                  Cửa hàng &amp; CMS
                </a>{" "}
                để nghệ sĩ thấy khi phát hành.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {CIS_STORE_IDS.map((id) => {
                  const meta = CIS_STORE_LABELS[id as CisStoreId];
                  const checked = deliveryCisStoreKeys.includes(id);
                  return (
                    <label
                      key={id}
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                        checked ? "border-emerald-400 bg-white shadow-sm" : "border-emerald-200/80 bg-white/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={() => {
                          setDeliveryCisStoreKeys((prev) =>
                            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                          );
                        }}
                      />
                      <span>
                        <span className="font-medium text-slate-900">{meta.name}</span>
                        <span className="block font-mono text-[10px] text-slate-500">{id}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="sm:col-span-2 rounded-lg border border-violet-100 bg-violet-50/40 p-4">
              <h3 className="text-sm font-semibold text-violet-900">Tích hợp SFTP (DDEX)</h3>
              <p className="mt-1 text-xs text-slate-600">
                JSON mảng giống biến <code className="rounded bg-white px-1">DDEX_SFTP_TARGETS</code> — chỉ áp dụng khi deal ở trạng thái <strong>Đang hiệu lực</strong>; merge với cấu hình SFTP trên server (env).
              </p>
              <textarea
                className="mt-2 min-h-[100px] w-full rounded-lg border border-violet-200 bg-white px-3 py-2 font-mono text-xs text-slate-900"
                value={deliverySftpTargetsJson}
                onChange={(e) => setDeliverySftpTargetsJson(e.target.value)}
                placeholder={`[{"host":"sftp.example.com","port":22,"user":"inbox","password":"…","remoteDir":"/incoming","label":"DSP"}]`}
              />
            </div>
            <div className="sm:col-span-2 rounded-lg border border-cyan-100 bg-cyan-50/40 p-4">
              <h3 className="text-sm font-semibold text-cyan-900">API phân tích từ store / đối tác</h3>
              <p className="mt-1 text-xs text-slate-600">
                Backend gọi URL này (cùng với <code className="rounded bg-white px-1">ANALYTICS_PARTNER_REPORT_URL</code> trên env) và gộp số stream theo cửa hàng.
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600">URL báo cáo JSON</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900"
                    value={analyticsReportUrl}
                    onChange={(e) => setAnalyticsReportUrl(e.target.value)}
                    placeholder="https://partner.example.com/api/v1/stream-summary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Phương thức</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    value={analyticsReportMethod}
                    onChange={(e) => setAnalyticsReportMethod(e.target.value as "GET" | "POST")}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Bearer (tuỳ chọn)</label>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900"
                    value={analyticsReportBearer}
                    onChange={(e) => setAnalyticsReportBearer(e.target.value)}
                    placeholder="Token — lưu trên server trong partner-deals.json"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Header xác thực tùy chỉnh</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900"
                    value={analyticsReportAuthHeader}
                    onChange={(e) => setAnalyticsReportAuthHeader(e.target.value)}
                    placeholder="X-Api-Key"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Giá trị header</label>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900"
                    value={analyticsReportAuthValue}
                    onChange={(e) => setAnalyticsReportAuthValue(e.target.value)}
                  />
                </div>
              </div>
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
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Giao CIS</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">SFTP</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">API stream</th>
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
                  <td className="max-w-[160px] truncate px-4 py-3 font-mono text-[10px] text-slate-600" title={(d.deliveryCisStoreKeys ?? []).join(", ")}>
                    {d.deliveryCisStoreKeys?.length ? d.deliveryCisStoreKeys.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-xs">{d.deliverySftpTargetsJson?.trim() ? "✓" : "—"}</td>
                  <td className="px-4 py-3 text-center text-xs">{d.analyticsReportUrl?.trim() ? "✓" : "—"}</td>
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
