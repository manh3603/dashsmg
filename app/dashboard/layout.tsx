"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  Home,
  Rocket,
  Library,
  BarChart3,
  DollarSign,
  Users,
  Megaphone,
  Settings,
  LogOut,
  Shield,
  Store,
  UserCog,
  Handshake,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MiniAudioPlayer from "@/components/MiniAudioPlayer";
import RequireDashboardSession from "@/components/RequireDashboardSession";
import { useAccount } from "@/context/AccountContext";
import { useLanguage } from "@/context/LanguageContext";
import { BRAND_FULL, BRAND_SHORT } from "@/lib/brand";
import {
  canAccessFinancialReports,
  isCustomerAdmin,
  isPlatformAdmin,
  roleDisplayLabel,
} from "@/lib/permissions";
import { isBackendConfigured } from "@/lib/backend-api";

const menuItemsAll = [
  { nameKey: "nav.home" as const, icon: Home, path: "/dashboard" },
  { nameKey: "nav.distribute" as const, icon: Rocket, path: "/dashboard/distribute" },
  { nameKey: "nav.catalog" as const, icon: Library, path: "/dashboard/catalog" },
  { nameKey: "nav.analytics" as const, icon: BarChart3, path: "/dashboard/analytics", needsFinancial: true },
  { nameKey: "nav.finance" as const, icon: DollarSign, path: "/dashboard/finance", needsFinancial: true },
  { nameKey: "nav.artists" as const, icon: Users, path: "/dashboard/artists" },
  { nameKey: "nav.marketing" as const, icon: Megaphone, path: "/dashboard/marketing" },
] as const;

const platformAdminMenu = [
  { nameKey: "nav.stores" as const, icon: Store, path: "/dashboard/admin/stores" },
  { nameKey: "nav.accounts" as const, icon: UserCog, path: "/dashboard/admin/accounts" },
  { nameKey: "nav.deals" as const, icon: Handshake, path: "/dashboard/admin/deals" },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout, displayName, login } = useAccount();
  const { locale, t } = useLanguage();
  const menuItems = menuItemsAll.filter(
    (item) => !("needsFinancial" in item && item.needsFinancial) || canAccessFinancialReports(role)
  );
  const roleLabel = useMemo(() => roleDisplayLabel(role, locale), [role, locale]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  useEffect(() => {
    if (!isBackendConfigured()) return;
    void import("@/lib/catalog-sync").then((m) => m.syncCatalogWithBackend());
  }, []);

  return (
    <RequireDashboardSession>
      <div className="flex h-screen flex-col bg-gradient-to-br from-black via-violet-950 to-zinc-950">
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-60 shrink-0 flex-col border-r border-violet-900/40 bg-gradient-to-b from-zinc-950 via-black to-violet-950/90 text-slate-100 shadow-2xl shadow-black/50">
            <div className="border-b border-violet-900/30 p-5">
              <Link href="/dashboard" className="flex items-center gap-3">
                <BrandLogo size={40} />
                <div className="min-w-0">
                  <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-200 bg-clip-text text-sm font-bold leading-tight tracking-wide text-transparent">
                    {BRAND_FULL}
                  </span>
                  <p className="mt-0.5 text-[10px] leading-snug text-violet-300/70">{t("sidebar.tagline")}</p>
                </div>
              </Link>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
              {menuItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-violet-600/25 text-white ring-1 ring-violet-500/40"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                    }`}
                  >
                    <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-fuchsia-300" : "text-slate-500"}`} />
                    <span className="truncate">{t(item.nameKey)}</span>
                  </Link>
                );
              })}

              {isPlatformAdmin(role) && (
                <>
                  <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-violet-500/80">
                    {t("nav.opsQc")}
                  </div>
                  {platformAdminMenu.map((item) => {
                      const isActive = pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          href={item.path}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/25"
                              : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                          }`}
                        >
                          <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-amber-300" : "text-slate-500"}`} />
                          <span className="truncate">{t(item.nameKey)}</span>
                        </Link>
                      );
                    })}
                  <Link
                      href="/dashboard/admin/qc"
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        pathname === "/dashboard/admin/qc"
                          ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/25"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                      }`}
                    >
                      <Shield
                        className={`h-5 w-5 shrink-0 ${pathname === "/dashboard/admin/qc" ? "text-amber-300" : "text-slate-500"}`}
                      />
                      <span className="truncate">{t("nav.qc")}</span>
                    </Link>
                </>
              )}
            </nav>
            <div className="space-y-1 border-t border-violet-900/30 p-3">
              <Link
                href="/dashboard/settings"
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  pathname === "/dashboard/settings"
                    ? "bg-violet-600/25 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                }`}
              >
                <Settings className="h-5 w-5 shrink-0 text-slate-500" />
                {t("nav.settings")}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-300/90 hover:bg-red-950/30"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {t("nav.logout")}
              </button>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-br from-zinc-950/50 via-transparent to-violet-950/20">
            <header className="flex items-center justify-between border-b border-violet-900/30 bg-black/35 px-6 py-3 backdrop-blur-md">
              <div className="flex min-w-0 items-center gap-3">
                <BrandLogo size={32} href="/dashboard" className="ring-1 ring-violet-500/25" />
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    isPlatformAdmin(role)
                      ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/30"
                      : isCustomerAdmin(role)
                        ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-500/30"
                        : "bg-zinc-800 text-slate-300"
                  }`}
                >
                  {roleLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2 rounded-full border border-violet-800/50 bg-zinc-900/80 px-3 py-1.5 text-sm text-slate-200 shadow-lg shadow-black/20 hover:border-violet-600/50 hover:bg-zinc-900"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-semibold text-white">
                    {(displayName || login || BRAND_SHORT).slice(0, 2).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[140px] truncate sm:inline">{displayName || login || t("header.profile")}</span>
                </Link>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
          </div>
        </div>
        <MiniAudioPlayer />
      </div>
    </RequireDashboardSession>
  );
}
