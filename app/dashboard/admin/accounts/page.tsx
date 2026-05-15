"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, UserPlus, RefreshCw } from "lucide-react";
import RequirePlatformAdmin from "@/components/RequirePlatformAdmin";
import type { AccountRole } from "@/lib/smg-storage";
import { getApiSessionToken } from "@/lib/smg-storage";
import {
  isBackendConfigured,
  postAdminAccountDelete,
  postAdminAccountList,
  postAdminAccountUpsert,
  type ServerStoredAccount,
} from "@/lib/backend-api";
import { useLanguage } from "@/context/LanguageContext";
import { roleDisplayLabel } from "@/lib/permissions";

const ROLE_OPTIONS: { value: AccountRole; label: string }[] = [
  { value: "artist", label: "Nghệ sĩ / thành viên" },
  { value: "customer_admin", label: "Admin khách hàng (label)" },
  { value: "platform_admin", label: "Quản trị nền tảng" },
];

export default function AdminAccountsPage() {
  const { locale } = useLanguage();
  const [rows, setRows] = useState<ServerStoredAccount[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [login, setLogin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [orgLabel, setOrgLabel] = useState("");
  const [royaltyPct, setRoyaltyPct] = useState("");
  const [newRole, setNewRole] = useState<AccountRole>("artist");
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoadError(null);
    if (!isBackendConfigured()) {
      setLoadError("Chưa cấu hình API.");
      setRows([]);
      return;
    }
    const t = getApiSessionToken();
    if (!t) {
      setLoadError("Phiên đăng nhập thiếu token API — đăng xuất rồi đăng nhập lại.");
      setRows([]);
      return;
    }
    const r = await postAdminAccountList(t);
    if (!r.ok) {
      setLoadError(r.error);
      setRows([]);
      return;
    }
    setRows(r.accounts);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void reload();
    });
    return () => cancelAnimationFrame(id);
  }, [reload]);

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = getApiSessionToken();
    if (!t || !login.trim() || !displayName.trim()) return;
    setSaving(true);
    const pctRaw = royaltyPct.trim();
    const pct =
      pctRaw === ""
        ? undefined
        : Math.min(100, Math.max(0, Number.parseFloat(pctRaw)));
    const r = await postAdminAccountUpsert(t, {
      login: login.trim(),
      password: newPassword.trim() || undefined,
      displayName: displayName.trim(),
      role: newRole,
      orgLabel: orgLabel.trim() || undefined,
      royaltySharePercent: pctRaw !== "" && Number.isFinite(pct) ? pct : null,
    });
    setSaving(false);
    if (!r.ok) {
      setLoadError(r.error);
      return;
    }
    setRows(r.accounts);
    setLogin("");
    setNewPassword("");
    setDisplayName("");
    setOrgLabel("");
    setRoyaltyPct("");
    setNewRole("artist");
    setLoadError(null);
  };

  const changeRole = async (row: ServerStoredAccount, role: AccountRole) => {
    const t = getApiSessionToken();
    if (!t) return;
    setSaving(true);
    const r = await postAdminAccountUpsert(t, {
      login: row.login,
      displayName: row.displayName,
      role,
      orgLabel: row.orgLabel,
      royaltySharePercent: row.royaltySharePercent ?? null,
    });
    setSaving(false);
    if (!r.ok) {
      setLoadError(r.error);
      return;
    }
    setRows(r.accounts);
    setLoadError(null);
  };

  const removeRow = async (targetLogin: string) => {
    const t = getApiSessionToken();
    if (!t) return;
    if (!window.confirm(`Xóa tài khoản ${targetLogin}?`)) return;
    setSaving(true);
    const r = await postAdminAccountDelete(t, targetLogin);
    setSaving(false);
    if (!r.ok) {
      setLoadError(r.error);
      return;
    }
    setRows(r.accounts);
    setLoadError(null);
  };

  return (
    <RequirePlatformAdmin>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tài khoản hệ thống</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Tạo và quản lý tài khoản nghệ sĩ, admin nhãn và quản trị nền tảng. Dữ liệu đăng nhập (mật khẩu đã băm bcrypt) lưu trên máy chủ API trong{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">backend/data/accounts.json</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
            Tải lại
          </button>
        </div>

        {loadError && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            {loadError}
          </p>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <UserPlus className="h-5 w-5 text-violet-600" />
            Thêm / cập nhật tài khoản
          </h2>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => void addUser(e)}>
            <div>
              <label className="text-xs font-medium text-slate-600">Email / tên đăng nhập</label>
              <input
                type="text"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="user@label.com"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Mật khẩu (bắt buộc nếu tài khoản mới)</label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Để trống khi chỉnh sửa — giữ mật khẩu cũ"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Tên hiển thị</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Tổ chức / label (tuỳ chọn)</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                value={orgLabel}
                onChange={(e) => setOrgLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Tỷ lệ % bản quyền (net, theo hợp đồng)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                value={royaltyPct}
                onChange={(e) => setRoyaltyPct(e.target.value)}
                placeholder="Để trống nếu chưa ký deal"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Vai trò</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AccountRole)}
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving || !getApiSessionToken()}
                className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50"
              >
                Lưu lên máy chủ
              </button>
              <p className="mt-2 text-xs text-slate-500">Cùng một email đăng nhập sẽ được cập nhật. Tài khoản mới cần mật khẩu tối thiểu 8 ký tự.</p>
            </div>
          </form>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Đăng nhập</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Tên</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Label</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">% bản quyền</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Vai trò</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-xs text-slate-800">{r.login}</td>
                  <td className="px-4 py-3 text-slate-700">{r.displayName}</td>
                  <td className="px-4 py-3 text-slate-600">{r.orgLabel ?? "—"}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      className="w-24 rounded-md border border-slate-200 px-2 py-1 text-slate-900"
                      defaultValue={r.royaltySharePercent ?? ""}
                      key={`roy-${r.id}-${r.royaltySharePercent ?? "x"}`}
                      title="Phần trăm doanh thu net theo hợp đồng"
                      onBlur={async (e) => {
                        const t = getApiSessionToken();
                        if (!t) return;
                        const raw = e.target.value.trim();
                        const n = Number.parseFloat(raw);
                        const royaltySharePercent = raw === "" || !Number.isFinite(n) ? null : Math.min(100, Math.max(0, n));
                        const r2 = await postAdminAccountUpsert(t, {
                          login: r.login,
                          displayName: r.displayName,
                          role: r.role,
                          orgLabel: r.orgLabel,
                          royaltySharePercent,
                        });
                        if (r2.ok) setRows(r2.accounts);
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="w-full max-w-[220px] rounded-md border border-slate-200 px-2 py-1 text-slate-900"
                      value={r.role}
                      onChange={(e) => void changeRole(r, e.target.value as AccountRole)}
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[10px] text-slate-500">{roleDisplayLabel(r.role, locale)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void removeRow(r.login)}
                      className="inline-flex rounded-lg p-2 text-red-600 hover:bg-red-50"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Phân quyền</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-slate-600">
            <li>
              <strong className="text-slate-800">Quản trị nền tảng</strong> — CMS cửa hàng, QC, trang này.
            </li>
            <li>
              <strong className="text-slate-800">Admin khách hàng</strong> — QC và khu vực nghệ sĩ; không CMS / không quản lý tài khoản hệ thống.
            </li>
            <li>
              <strong className="text-slate-800">Nghệ sĩ</strong> — không truy cập khu vực admin.
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Lần triển khai đầu: đặt <code className="text-[10px]">AUTH_BOOTSTRAP_SECRET</code> trong backend/.env rồi gọi{" "}
            <code className="text-[10px]">POST /api/auth/bootstrap-first-admin</code> (một lần) hoặc tạo tài khoản quản trị trực tiếp trên server.
          </p>
        </div>
      </div>
    </RequirePlatformAdmin>
  );
}
