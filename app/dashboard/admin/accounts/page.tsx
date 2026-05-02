"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import RequirePlatformAdmin from "@/components/RequirePlatformAdmin";
import type { AccountRole, ManagedUserRecord } from "@/lib/smg-storage";
import { getManagedUsers, removeManagedUser, upsertManagedUser } from "@/lib/smg-storage";
import { roleDisplayLabel } from "@/lib/permissions";

const ROLE_OPTIONS: { value: AccountRole; label: string }[] = [
  { value: "artist", label: "Nghệ sĩ / thành viên" },
  { value: "customer_admin", label: "Admin khách hàng" },
  { value: "platform_admin", label: "Quản trị nền tảng" },
];

export default function AdminAccountsPage() {
  const [rows, setRows] = useState<ManagedUserRecord[]>([]);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [orgLabel, setOrgLabel] = useState("");
  const [royaltyPct, setRoyaltyPct] = useState("");
  const [newRole, setNewRole] = useState<AccountRole>("artist");

  const reload = useCallback(() => setRows(getManagedUsers()), []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) reload();
    });
    const on = () => queueMicrotask(() => !cancelled && reload());
    window.addEventListener("smg-storage", on);
    return () => {
      cancelled = true;
      window.removeEventListener("smg-storage", on);
    };
  }, [reload]);

  const addUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !displayName.trim()) return;
    const pctRaw = royaltyPct.trim();
    const pct =
      pctRaw === ""
        ? undefined
        : Math.min(100, Math.max(0, Number.parseFloat(pctRaw)));
    upsertManagedUser({
      email: email.trim(),
      displayName: displayName.trim(),
      orgLabel: orgLabel.trim() || undefined,
      role: newRole,
      royaltySharePercent: pctRaw !== "" && Number.isFinite(pct) ? pct : undefined,
    });
    setEmail("");
    setDisplayName("");
    setOrgLabel("");
    setRoyaltyPct("");
    setNewRole("artist");
    reload();
  };

  const changeRole = (id: string, role: AccountRole) => {
    const u = rows.find((r) => r.id === id);
    if (!u) return;
    upsertManagedUser({ ...u, role });
    reload();
  };

  return (
    <RequirePlatformAdmin>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tài khoản hệ thống</h1>
          <p className="mt-1 text-sm text-slate-600">
            Chỉ quản trị nền tảng quản lý danh sách người dùng (demo lưu trên trình duyệt). Khi tích hợp backend auth, thay bằng API thật.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <UserPlus className="h-5 w-5 text-cyan-600" />
            Thêm / cập nhật tài khoản
          </h2>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={addUser}>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@label.com"
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
                placeholder="Ví dụ 85 — để trống nếu chưa ký deal"
              />
            </div>
            <div className="sm:col-span-2">
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
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              >
                Lưu vào danh sách
              </button>
              <p className="mt-2 text-xs text-slate-500">Cùng một email sẽ được cập nhật thay vì tạo trùng.</p>
            </div>
          </form>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
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
                  <td className="px-4 py-3 text-slate-800">{r.email}</td>
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
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        if (raw === "") {
                          upsertManagedUser({ ...r, royaltySharePercent: undefined });
                        } else {
                          const n = Number.parseFloat(raw);
                          if (Number.isFinite(n)) {
                            upsertManagedUser({ ...r, royaltySharePercent: Math.min(100, Math.max(0, n)) });
                          }
                        }
                        reload();
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="w-full max-w-[220px] rounded-md border border-slate-200 px-2 py-1 text-slate-900"
                      value={r.role}
                      onChange={(e) => changeRole(r.id, e.target.value as AccountRole)}
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[10px] text-slate-500">{roleDisplayLabel(r.role)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        removeManagedUser(r.id);
                        reload();
                      }}
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
          <p className="font-medium text-slate-900">Tóm tắt phân quyền</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-slate-600">
            <li>
              <strong className="text-slate-800">Quản trị nền tảng</strong> — CMS cửa hàng, QC, trang này (quản lý tài khoản).
            </li>
            <li>
              <strong className="text-slate-800">Admin khách hàng</strong> — QC &amp; toàn bộ khu vực nghệ sĩ; không CMS, không quản lý
              tài khoản hệ thống.
            </li>
            <li>
              <strong className="text-slate-800">Nghệ sĩ</strong> — không truy cập khu vực admin.
            </li>
          </ul>
        </div>
      </div>
    </RequirePlatformAdmin>
  );
}
