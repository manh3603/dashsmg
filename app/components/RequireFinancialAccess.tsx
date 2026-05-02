"use client";

import Link from "next/link";
import { useAccount } from "@/context/AccountContext";
import { canAccessFinancialReports } from "@/lib/permissions";

/** Tài chính, phân tích doanh thu — admin nền tảng hoặc admin khách hàng (không nghệ sĩ). */
export default function RequireFinancialAccess({ children }: { children: React.ReactNode }) {
  const { role, ready } = useAccount();

  if (!ready) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">Đang tải…</div>
    );
  }

  if (!canAccessFinancialReports(role)) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-lg font-semibold text-amber-900">Khu vực dành cho quản trị</h1>
        <p className="mt-2 text-sm text-amber-800">
          Báo cáo tài chính và phân tích doanh thu chỉ dành cho quản trị nền tảng hoặc admin khách hàng. Đăng nhập bằng tài
          khoản có quyền tương ứng.
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
