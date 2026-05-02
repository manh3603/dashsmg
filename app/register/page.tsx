"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Music, Mail, User } from "lucide-react";
import { useAccount } from "@/context/AccountContext";

type AccountType = "artist" | "label" | null;

export default function RegisterPage() {
  const { setSession } = useAccount();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [accountType, setAccountType] = useState<AccountType>(null);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountType) return;
    const dn = name.trim() || email.trim() || "Nghệ sĩ";
    setSession("artist", email.trim() || "artist@smg.local", dn);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center text-cyan-600">
          <Music size={48} />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">Đăng ký</h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-cyan-600 hover:text-cyan-500">
            Đăng nhập
          </Link>
        </p>

        <div className="mt-8 flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-12 rounded-full transition-colors ${step >= s ? "bg-cyan-600" : "bg-slate-200"}`}
            />
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">
          Bước {step}/3:{" "}
          {step === 1 ? "Thông tin cơ bản" : step === 2 ? "Xác thực email" : "Loại tài khoản"}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          {step === 1 && (
            <form className="space-y-5" onSubmit={handleStep1}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Họ tên / Tên hiển thị</label>
                <div className="mt-1 relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <div className="mt-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-md bg-cyan-600 text-white font-medium hover:bg-cyan-700">
                Tiếp tục
              </button>
            </form>
          )}

          {step === 2 && (
            <form className="space-y-5" onSubmit={handleStep2}>
              <p className="text-sm text-slate-600">
                Chúng tôi đã gửi mã OTP đến <strong className="text-slate-900">{email || "email của bạn"}</strong>. Nhập mã
                để xác thực (demo: nhập bất kỳ 6 số).
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700">Mã OTP</label>
                <input
                  required
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md tracking-widest text-center text-lg outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                />
              </div>
              <button type="button" className="text-sm text-cyan-600 hover:underline" onClick={() => alert("Đã gửi lại OTP (demo)")}>
                Gửi lại OTP
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-2.5 border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50">
                  Quay lại
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-md bg-cyan-600 text-white font-medium hover:bg-cyan-700">
                  Xác thực
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form className="space-y-5" onSubmit={handleStep3}>
              <p className="text-sm text-slate-600">Chọn loại tài khoản phù hợp với bạn.</p>
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType("artist")}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    accountType === "artist" ? "border-cyan-600 bg-cyan-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="font-semibold text-slate-900">Nghệ sĩ độc lập</span>
                  <p className="mt-1 text-sm text-slate-600">Một nghệ sĩ, một hồ sơ phát hành.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("label")}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    accountType === "label" ? "border-cyan-600 bg-cyan-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="font-semibold text-slate-900">Nhãn đĩa (Label)</span>
                  <p className="mt-1 text-sm text-slate-600">Quản lý nhiều nghệ sĩ và bản phát hành.</p>
                </button>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-2.5 border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50">
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={!accountType}
                  className="flex-1 py-2.5 rounded-md bg-cyan-600 text-white font-medium hover:bg-cyan-700 disabled:opacity-50"
                >
                  Hoàn tất
                </button>
              </div>
            </form>
          )}
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
