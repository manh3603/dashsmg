"use client";

import Link from "next/link";
import { useAccount } from "@/context/AccountContext";
import { useLanguage } from "@/context/LanguageContext";
import { isPlatformAdmin } from "@/lib/permissions";

/** Chỉ quản trị nền tảng OMG (CMS cửa hàng, tài khoản hệ thống, v.v.). */
export default function RequirePlatformAdmin({ children }: { children: React.ReactNode }) {
  const { role, ready } = useAccount();
  const { t } = useLanguage();

  if (!ready) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">{t("common.loading")}</div>
    );
  }

  if (!isPlatformAdmin(role)) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-lg font-semibold text-amber-900">{t("gate.platformAdmin.title")}</h1>
        <p className="mt-2 text-sm text-amber-800">{t("gate.platformAdmin.body")}</p>
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
