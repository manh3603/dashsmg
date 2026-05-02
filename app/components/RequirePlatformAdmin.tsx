"use client";

import Link from "next/link";
import { useAccount } from "@/context/AccountContext";
import { isPlatformAdmin } from "@/lib/permissions";

/** Chỉ quản trị nền tảng SMG (CMS cửa hàng, tài khoản hệ thống, v.v.). */
export default function RequirePlatformAdmin({ children }: { children: React.ReactNode }) {
  const { role, ready } = useAccount();

  if (!ready) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">Đang tải…</div>
    );
  }

  if (!isPlatformAdmin(role)) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-lg font-semibold text-amber-900">Khu vực dành cho quản trị nền tảng</h1>
        <p className="mt-2 text-sm text-amber-800">
          Chỉ tài khoản quản trị nền tảng SMG mới truy cập cấu hình CMS và quản lý tài khoản hệ thống. Đăng nhập đúng vai trò hoặc
          liên hệ đội vận hành.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Về trang chủ dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
