"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Music, KeyRound, Link2 } from "lucide-react";

type Mode = "choose" | "otp" | "link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sent, setSent] = useState(false);

  const sendReset = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center text-violet-600">
          <Music size={48} />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">Quên mật khẩu</h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Khôi phục bằng OTP hoặc liên kết đặt lại qua email khi tổ chức của bạn đã bật dịch vụ thư.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          {mode === "choose" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Chọn phương thức:</p>
              <button
                type="button"
                onClick={() => setMode("otp")}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"
              >
                <KeyRound className="h-8 w-8 text-cyan-600 shrink-0" />
                <div>
                  <span className="font-medium text-slate-900">OTP đã mã hóa</span>
                  <p className="text-sm text-slate-500">Nhận mã 6 số qua email và đặt mật khẩu mới.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode("link")}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"
              >
                <Link2 className="h-8 w-8 text-cyan-600 shrink-0" />
                <div>
                  <span className="font-medium text-slate-900">Liên kết đặt lại</span>
                  <p className="text-sm text-slate-500">Nhận link có thời hạn để tạo mật khẩu mới.</p>
                </div>
              </button>
            </div>
          )}

          {mode === "otp" && (
            <form className="space-y-5" onSubmit={sendReset}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {!sent ? (
                <button type="submit" className="w-full py-2.5 rounded-md bg-cyan-600 text-white font-medium hover:bg-cyan-700">
                  Gửi OTP
                </button>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Mã OTP</label>
                    <input
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6 chữ số"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Mật khẩu mới</label>
                    <input
                      type="password"
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="w-full py-2.5 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:from-violet-700 hover:to-fuchsia-700"
                  >
                    Xác nhận đặt lại
                  </button>
                </>
              )}
              <button type="button" onClick={() => { setMode("choose"); setSent(false); }} className="w-full text-sm text-slate-500 hover:text-slate-800">
                ← Phương thức khác
              </button>
            </form>
          )}

          {mode === "link" && (
            <form className="space-y-5" onSubmit={sendReset}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-md bg-cyan-600 text-white font-medium hover:bg-cyan-700">
                Gửi liên kết đặt lại
              </button>
              {sent && (
                <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                  Nếu dịch vụ thư đã bật, kiểm tra hộp thư và thư mục spam. Liên hệ quản trị nếu không nhận được.
                </p>
              )}
              <button type="button" onClick={() => { setMode("choose"); setSent(false); }} className="w-full text-sm text-slate-500 hover:text-slate-800">
                ← Phương thức khác
              </button>
            </form>
          )}
        </div>
        <p className="mt-6 text-center">
          <Link href="/login" className="text-sm text-cyan-600 hover:text-cyan-500">
            ← Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
