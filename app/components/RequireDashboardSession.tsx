"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/context/AccountContext";

/** Chặn /dashboard/* khi chưa có phiên (localStorage) — tránh vào thẳng URL. */
export default function RequireDashboardSession({ children }: { children: React.ReactNode }) {
  const { role } = useAccount();
  const router = useRouter();
  const isClient = useSyncExternalStore(() => () => {}, () => true, () => false);

  useEffect(() => {
    if (!isClient) return;
    if (!role) {
      router.replace("/login");
    }
  }, [isClient, role, router]);

  if (!isClient) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Đang tải…</div>
    );
  }

  if (!role) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Chuyển hướng đến đăng nhập…</div>
    );
  }

  return <>{children}</>;
}
