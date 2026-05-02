"use client";

import { useEffect, useState } from "react";
import { User, Shield, Building2, Bell, Percent } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { getManagedUsers } from "@/lib/smg-storage";

export default function SettingsPage() {
  const { displayName, login } = useAccount();
  const [emailNotif, setEmailNotif] = useState(true);
  const [reviewNotif, setReviewNotif] = useState(true);
  const [payoutNotif, setPayoutNotif] = useState(true);
  const [contractRoyalty, setContractRoyalty] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => {
      if (!login) {
        setContractRoyalty(null);
        return;
      }
      const u = getManagedUsers().find((x) => x.email.toLowerCase() === login.toLowerCase());
      setContractRoyalty(u?.royaltySharePercent ?? null);
    };
    sync();
    window.addEventListener("smg-storage", sync);
    return () => window.removeEventListener("smg-storage", sync);
  }, [login]);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cài đặt tài khoản</h1>
        <p className="mt-1 text-slate-600">Hồ sơ, bảo mật, thông tin nhãn và thông báo email</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          <User className="h-5 w-5 text-cyan-600" />
          <h2 className="text-lg font-semibold">Hồ sơ cá nhân</h2>
        </div>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 text-lg font-bold text-cyan-800">
            {(displayName || login || "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Tên hiển thị</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500"
                defaultValue={displayName ?? ""}
                placeholder="Chưa đăng nhập"
                readOnly
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Đăng nhập</label>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                defaultValue={login ?? ""}
                placeholder="—"
                readOnly
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          <Shield className="h-5 w-5 text-cyan-600" />
          <h2 className="text-lg font-semibold">Bảo mật</h2>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Đổi mật khẩu</label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <input type="password" placeholder="Mật khẩu hiện tại" className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900" />
              <input type="password" placeholder="Mật khẩu mới" className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900" />
            </div>
            <button type="button" className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Cập nhật mật khẩu
            </button>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div>
              <p className="font-medium text-slate-900">Bảo mật 2 lớp (2FA)</p>
              <p className="text-sm text-slate-500">Ứng dụng xác thực (TOTP) hoặc SMS</p>
            </div>
            <button type="button" className="rounded-lg border border-cyan-600 px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50" onClick={() => alert("Bật 2FA (demo)")}>
              Kích hoạt
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          <Percent className="h-5 w-5 text-cyan-600" />
          <h2 className="text-lg font-semibold">Hợp đồng &amp; tỷ lệ bản quyền</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Quản trị nền tảng cấu hình % doanh thu net theo từng tài khoản (trang Tài khoản hệ thống). Giá trị dưới đây khớp email đăng
          nhập hiện tại.
        </p>
        <p className="mt-4 text-sm text-slate-800">
          {contractRoyalty != null ? (
            <>
              Tỷ lệ ghi nhận: <strong className="tabular-nums">{contractRoyalty}%</strong> (trên doanh thu net sau phí nền tảng / cửa
              hàng, theo deal đã ký).
            </>
          ) : (
            <span className="text-slate-500">Chưa gán tỷ lệ cho email này — liên hệ SMG hoặc quản trị.</span>
          )}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          <Building2 className="h-5 w-5 text-cyan-600" />
          <h2 className="text-lg font-semibold">Thông tin nhãn (Label)</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">Dùng cho tài khoản nhãn đĩa — hiển thị trên metadata khi phát hành.</p>
        <div className="mt-4 space-y-3">
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" placeholder="Tên nhãn đĩa" />
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900" placeholder="Mã nhãn / distributor ID (nếu có)" />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          <Bell className="h-5 w-5 text-cyan-600" />
          <h2 className="text-lg font-semibold">Thông báo</h2>
        </div>
        <ul className="mt-6 space-y-4">
          <li className="flex items-center justify-between">
            <span className="text-slate-700">Email tóm tắt hàng tuần</span>
            <input type="checkbox" className="h-4 w-4 accent-cyan-600" checked={emailNotif} onChange={() => setEmailNotif(!emailNotif)} />
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-700">Khi bài hát được duyệt / từ chối</span>
            <input type="checkbox" className="h-4 w-4 accent-cyan-600" checked={reviewNotif} onChange={() => setReviewNotif(!reviewNotif)} />
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-700">Khi có tiền về / thanh toán</span>
            <input type="checkbox" className="h-4 w-4 accent-cyan-600" checked={payoutNotif} onChange={() => setPayoutNotif(!payoutNotif)} />
          </li>
        </ul>
      </section>
    </div>
  );
}
