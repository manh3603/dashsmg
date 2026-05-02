"use client";

import Link from "next/link";
import { useAccount } from "@/context/AccountContext";
import { canAccessQc } from "@/lib/permissions";

/** QC & duyệt — admin nền tảng hoặc admin khách hàng. */
export default function RequireQcAccess({ children }: { children: React.ReactNode }) {
  const { role, ready } = useAccount();

  if (!ready) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">Đang tải…</div>
    );
  }

  if (!canAccessQc(role)) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-lg font-semibold text-amber-900">Khu vực dành cho QC</h1>
        <p className="mt-2 text-sm text-amber-800">
          Chỉ quản trị nền tảng hoặc admin khách hàng mới duyệt hàng chờ phát hành. Đăng nhập bằng tài khoản có quyền QC.
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
