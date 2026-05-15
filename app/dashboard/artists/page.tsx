"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, ExternalLink, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { useLanguage } from "@/context/LanguageContext";
import { canManageLabelArtists } from "@/lib/permissions";
import { getApiSessionToken } from "@/lib/smg-storage";
import {
  isBackendConfigured,
  postLabelArtistDelete,
  postLabelArtistList,
  postLabelArtistUpsert,
  type ServerStoredAccount,
} from "@/lib/backend-api";

const demoArtists = [
  { name: "Artist chính", role: "Bạn", verified: true, platforms: ["Spotify for Artists", "Apple Music for Artists"] },
  { name: "Feat. MC Blue", role: "Nghệ sĩ khách", verified: false, platforms: [] },
];

function LabelArtistAccountsPanel() {
  const [rows, setRows] = useState<ServerStoredAccount[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [login, setLogin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [royaltyPct, setRoyaltyPct] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoadError(null);
    if (!isBackendConfigured()) {
      setLoadError("Chưa cấu hình API backend.");
      setRows([]);
      return;
    }
    const tok = getApiSessionToken();
    if (!tok) {
      setLoadError("Phiên đăng nhập thiếu token API — đăng xuất rồi đăng nhập lại.");
      setRows([]);
      return;
    }
    const r = await postLabelArtistList(tok);
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

  const addArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    const tok = getApiSessionToken();
    if (!tok || !login.trim() || !displayName.trim()) return;
    setSaving(true);
    const pctRaw = royaltyPct.trim();
    const pct =
      pctRaw === ""
        ? undefined
        : Math.min(100, Math.max(0, Number.parseFloat(pctRaw)));
    const r = await postLabelArtistUpsert(tok, {
      login: login.trim(),
      password: newPassword.trim() || undefined,
      displayName: displayName.trim(),
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
    setRoyaltyPct("");
    setLoadError(null);
  };

  const removeRow = async (targetLogin: string) => {
    const tok = getApiSessionToken();
    if (!tok) return;
    if (!window.confirm(`Xóa tài khoản nghệ sĩ «${targetLogin}»?`)) return;
    setSaving(true);
    const r = await postLabelArtistDelete(tok, targetLogin);
    setSaving(false);
    if (!r.ok) {
      setLoadError(r.error);
      return;
    }
    setRows(r.accounts);
    setLoadError(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-4 text-sm text-violet-950">
        <p className="font-medium">Tài khoản nghệ sĩ con (sub-account)</p>
        <p className="mt-1 text-violet-800">
          Tạo đăng nhập cho nghệ sĩ thuộc nhãn của bạn. Họ chỉ phát hành và xem kho nhạc — không có quyền QC hay quản trị
          nền tảng.
        </p>
      </div>

      {loadError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</p>
      )}

      <form
        onSubmit={(e) => void addArtist(e)}
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2"
      >
        <h2 className="sm:col-span-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <UserPlus className="h-5 w-5 text-violet-600" />
          Thêm / cập nhật nghệ sĩ
        </h2>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Email đăng nhập</span>
          <input
            type="email"
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="artist@label.com"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Tên hiển thị</span>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Mật khẩu (mới: tối thiểu 8 ký tự)</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Để trống nếu chỉ sửa tên / %"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">% royalty (0–100)</span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={royaltyPct}
            onChange={(e) => setRoyaltyPct(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? "Đang lưu…" : "Lưu tài khoản"}
          </button>
          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Đăng nhập</th>
              <th className="px-4 py-3 font-medium">Tên</th>
              <th className="px-4 py-3 font-medium">% royalty</th>
              <th className="px-4 py-3 font-medium">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Chưa có nghệ sĩ con — tạo tài khoản ở form phía trên.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.login}</td>
                  <td className="px-4 py-3 text-slate-600">{r.displayName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.royaltySharePercent != null ? `${r.royaltySharePercent}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setLogin(r.login);
                        setDisplayName(r.displayName);
                        setRoyaltyPct(r.royaltySharePercent != null ? String(r.royaltySharePercent) : "");
                        setNewPassword("");
                      }}
                      className="mr-3 text-violet-600 hover:underline"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void removeRow(r.login)}
                      className="inline-flex items-center gap-1 text-red-600 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ArtistProfilesTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">Nghệ sĩ</th>
            <th className="px-4 py-3 font-medium">Vai trò</th>
            <th className="px-4 py-3 font-medium">Xác thực</th>
            <th className="px-4 py-3 font-medium">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {demoArtists.map((a) => (
            <tr key={a.name} className="hover:bg-slate-50/80">
              <td className="px-4 py-3 font-medium text-slate-900">{a.name}</td>
              <td className="px-4 py-3 text-slate-600">{a.role}</td>
              <td className="px-4 py-3">
                {a.verified ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <BadgeCheck className="h-4 w-4" /> Đã xác minh
                  </span>
                ) : (
                  <span className="text-amber-700">Chưa xác minh</span>
                )}
              </td>
              <td className="px-4 py-3">
                <a
                  href="https://artists.spotify.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-violet-600 hover:underline"
                >
                  Spotify for Artists
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ArtistsPage() {
  const { t } = useLanguage();
  const { role, ready } = useAccount();
  const isLabelAdmin = ready && canManageLabelArtists(role);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("artists.title")}</h1>
        <p className="mt-1 text-slate-600">
          {isLabelAdmin
            ? "Quản lý tài khoản nghệ sĩ con và hồ sơ phát hành thuộc nhãn của bạn."
            : t("artists.subtitle")}
        </p>
      </div>

      {isLabelAdmin ? <LabelArtistAccountsPanel /> : <ArtistProfilesTable />}
    </div>
  );
}
