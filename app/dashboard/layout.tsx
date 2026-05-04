"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
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
import MiniAudioPlayer from "@/components/MiniAudioPlayer";
import RequireDashboardSession from "@/components/RequireDashboardSession";
import { useAccount } from "@/context/AccountContext";
import { canAccessFinancialReports, canAccessQc, isPlatformAdmin, roleDisplayLabel } from "@/lib/permissions";
import { isBackendConfigured } from "@/lib/backend-api";

const menuItemsAll = [
  { name: "Trang chủ", icon: Home, path: "/dashboard" },
  { name: "Phát hành nhạc", icon: Rocket, path: "/dashboard/distribute" },
  { name: "Kho nhạc", icon: Library, path: "/dashboard/catalog" },
  { name: "Phân tích", icon: BarChart3, path: "/dashboard/analytics", needsFinancial: true },
  { name: "Tài chính & Thu nhập", icon: DollarSign, path: "/dashboard/finance", needsFinancial: true },
  { name: "Nghệ sĩ", icon: Users, path: "/dashboard/artists" },
  { name: "Công cụ Marketing", icon: Megaphone, path: "/dashboard/marketing" },
] as const;

const platformAdminMenu = [
  { name: "Cửa hàng & CMS", icon: Store, path: "/dashboard/admin/stores" },
  { name: "Tài khoản hệ thống", icon: UserCog, path: "/dashboard/admin/accounts" },
  { name: "Deal đối tác", icon: Handshake, path: "/dashboard/admin/deals" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout, displayName, login } = useAccount();
  const menuItems = menuItemsAll.filter(
    (item) => !("needsFinancial" in item && item.needsFinancial) || canAccessFinancialReports(role)
  );

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
              <Link
                href="/dashboard"
                className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-200 bg-clip-text text-lg font-bold tracking-wide text-transparent drop-shadow-sm"
              >
                SMG Distribution
              </Link>
              <p className="mt-1 text-xs text-violet-300/70">Bảng điều khiển phát hành</p>
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
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}

              {(isPlatformAdmin(role) || canAccessQc(role)) && (
                <>
                  <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-violet-500/80">
                    Vận hành &amp; QC
                  </div>
                  {isPlatformAdmin(role) &&
                    platformAdminMenu.map((item) => {
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
                          <span className="truncate">{item.name}</span>
                        </Link>
                      );
                    })}
                  {canAccessQc(role) && (
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
                      <span className="truncate">QC &amp; duyệt</span>
                    </Link>
                  )}
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
                Cài đặt tài khoản
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-300/90 hover:bg-red-950/30"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                Đăng xuất
              </button>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-br from-zinc-950/50 via-transparent to-violet-950/20">
            <header className="flex items-center justify-between border-b border-violet-900/30 bg-black/35 px-6 py-3 backdrop-blur-md">
              <span className="text-xs font-medium text-slate-400">
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    isPlatformAdmin(role)
                      ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/30"
                      : canAccessQc(role)
                        ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-500/30"
                        : "bg-zinc-800 text-slate-300"
                  }`}
                >
                  {roleDisplayLabel(role)}
                </span>
              </span>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 rounded-full border border-violet-800/50 bg-zinc-900/80 px-3 py-1.5 text-sm text-slate-200 shadow-lg shadow-black/20 hover:border-violet-600/50 hover:bg-zinc-900"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-semibold text-white">
                  {(displayName || login || "SMG").slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden max-w-[140px] truncate sm:inline">{displayName || login || "Hồ sơ"}</span>
              </Link>
            </header>
            <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
          </div>
        </div>
        <MiniAudioPlayer />
      </div>
    </RequireDashboardSession>
  );
}
