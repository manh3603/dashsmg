"use client";

import Link from "next/link";
import { useAccount } from "@/context/AccountContext";
import { useLanguage } from "@/context/LanguageContext";
import { canAccessFinancialReports } from "@/lib/permissions";

/** Tài chính, phân tích doanh thu — admin nền tảng hoặc admin khách hàng (không nghệ sĩ). */
export default function RequireFinancialAccess({ children }: { children: React.ReactNode }) {
  const { role, ready } = useAccount();
  const { t } = useLanguage();

  if (!ready) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">{t("common.loading")}</div>
    );
  }

  if (!canAccessFinancialReports(role)) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-lg font-semibold text-amber-900">{t("gate.finance.title")}</h1>
        <p className="mt-2 text-sm text-amber-800">{t("gate.finance.body")}</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {t("gate.backDashboard")}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
