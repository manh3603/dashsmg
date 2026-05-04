"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Music } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import {
  fetchBackendHealthPayload,
  fetchDemoAuthHints,
  isBackendConfigured,
  postAuthLogin,
  type DemoAccountHint,
} from "@/lib/backend-api";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAccount();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hints, setHints] = useState<DemoAccountHint[] | null>(null);
  const [hintNote, setHintNote] = useState<string | null>(null);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isBackendConfigured()) {
      setApiReachable(false);
      return;
    }
    let cancelled = false;
    void fetchBackendHealthPayload().then((h) => {
      if (cancelled) return;
      setApiReachable(Boolean(h?.ok));
    });
    void fetchDemoAuthHints().then((h) => {
      if (cancelled || !h?.accounts?.length) return;
      setHints(h.accounts);
      setHintNote(h.note ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isBackendConfigured()) {
      setError("Không xác định được URL API (thiếu cấu hình). Chạy «npm run dev:all» hoặc đặt NEXT_PUBLIC_BACKEND_URL nếu API ở máy khác.");
      return;
    }
    const r = await postAuthLogin(login, password);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setSession(r.data.role, r.data.login, r.data.displayName);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center text-cyan-600 hover:text-cyan-500">
          <Music size={48} />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">Đăng nhập</h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-medium text-cyan-600 hover:text-cyan-500">
            Đăng ký
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={(e) => void handleLogin(e)}>
            {apiReachable === false && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
                Không kết nối được API (proxy <code className="text-xs">/smg-api</code> → cổng 3001). Hãy chạy cả backend
                cùng Next: <code className="rounded bg-amber-100/80 px-1 text-xs">npm run dev:all</code> hoặc mở terminal
                thứ hai: <code className="rounded bg-amber-100/80 px-1 text-xs">npm run dev --prefix backend</code> rồi
                tải lại trang.
              </p>
            )}
            <div>
              <label htmlFor="login" className="block text-sm font-medium text-slate-700">
                Tên đăng nhập
              </label>
              <input
                id="login"
                type="text"
                required
                autoComplete="username"
                placeholder="admin, labeladmin, artist…"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">Có thể dùng dạng ngắn (admin) hoặc email (admin@smg.local).</p>
            </div>
            <div>
              <div className="flex justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Mật khẩu
                </label>
                <Link href="/forgot-password" className="text-sm text-cyan-600 hover:text-cyan-500">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="block w-full rounded-md border border-slate-300 py-2 pl-3 pr-11 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-800"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 font-medium"
            >
              Đăng nhập
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tài khoản demo</p>
            {!isBackendConfigured() && (
              <p className="mt-2 text-xs text-amber-800">
                Cần chạy backend (cổng 3001) kèm Next: <code className="text-xs">npm run dev:all</code>. Trình duyệt gọi API qua{" "}
                <code className="rounded bg-amber-100/80 px-1">/smg-api</code> (cùng máy với trang). API tách máy: đặt{" "}
                <code className="rounded bg-amber-100/80 px-1">NEXT_PUBLIC_BACKEND_URL</code> (URL public, không dùng localhost).
              </p>
            )}
            {hints && hints.length > 0 && (
              <ul className="mt-2 space-y-2 text-xs text-slate-700">
                {hints.map((a) => (
                  <li key={a.primaryLogin} className="rounded border border-slate-100 bg-white px-2 py-1.5">
                    <span className="font-mono font-medium text-slate-900">{a.primaryLogin}</span>
                    {a.aliases?.length ? (
                      <span className="text-slate-500"> — alias: {a.aliases.join(", ")}</span>
                    ) : null}
                    <br />
                    <span className="text-slate-600">{a.label}</span>
                  </li>
                ))}
              </ul>
            )}
            {hintNote && <p className="mt-3 text-[11px] text-slate-500">{hintNote}</p>}
            <p className="mt-2 text-[11px] text-slate-500">
              Mật khẩu do quản trị đặt trên server (<code className="text-[10px]">DEMO_AUTH_*_PASSWORD</code> trong{" "}
              <code className="text-[10px]">backend/.env</code>) — không nhúng trong mã frontend.
            </p>
          </div>
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
