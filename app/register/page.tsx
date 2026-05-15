"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { Mail, User, Building2 } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { useLanguage } from "@/context/LanguageContext";
import { isBackendConfigured, postAuthRegister } from "@/lib/backend-api";

type AccountType = "artist" | "label";

export default function RegisterPage() {
  const { setSession } = useAccount();
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("artist");
  const [orgLabel, setOrgLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isBackendConfigured()) {
      setError("Chưa cấu hình API. Chạy «npm run dev:all» hoặc đặt NEXT_PUBLIC_BACKEND_URL.");
      return;
    }
    setLoading(true);
    const r = await postAuthRegister({
      login: email.trim(),
      password,
      displayName: name.trim() || email.trim(),
      accountType,
      orgLabel: accountType === "label" ? orgLabel.trim() || undefined : undefined,
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setSession(r.data.role, r.data.login, r.data.displayName, r.data.sessionToken);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <BrandLogo size={56} className="rounded-lg" />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">{t("register.title")}</h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-violet-600 hover:text-violet-500">
            Đăng nhập
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200/80">
          <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Họ tên / Tên hiển thị *</label>
              <div className="mt-1 relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-violet-500 text-slate-900"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email đăng nhập *</label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-violet-500 text-slate-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Mật khẩu *</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-violet-500 text-slate-900"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">Tối thiểu 8 ký tự. Lưu trữ an toàn trên máy chủ (bcrypt).</p>
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-700">Loại tài khoản *</span>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setAccountType("artist")}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    accountType === "artist" ? "border-violet-600 bg-violet-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="font-semibold text-slate-900">Nghệ sĩ</span>
                  <p className="mt-1 text-xs text-slate-600">Hồ sơ phát hành cá nhân.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("label")}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    accountType === "label" ? "border-violet-600 bg-violet-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="font-semibold text-slate-900">Nhãn / Label</span>
                  <p className="mt-1 text-xs text-slate-600">Quản lý nhiều nghệ sĩ (admin khách hàng).</p>
                </button>
              </div>
            </div>

            {accountType === "label" && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Tên nhãn / công ty</label>
                <div className="mt-1 relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-violet-500 text-slate-900"
                    value={orgLabel}
                    onChange={(e) => setOrgLabel(e.target.value)}
                    placeholder="Công ty TNHH …"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-60"
            >
              {loading ? t("common.saving") : t("register.submit")}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Về trang chủ
          </Link>
        </p>
      </div>
    </div>
  );
}
