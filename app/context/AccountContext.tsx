"use client";

import React, { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type { AccountRole } from "@/lib/smg-storage";
import {
  clearSession,
  getDisplayName,
  getLogin,
  getRole,
  setRole as persistRole,
  setSession as persistSession,
} from "@/lib/smg-storage";

type Ctx = {
  role: AccountRole | null;
  login: string | null;
  displayName: string | null;
  ready: boolean;
  setRole: (r: AccountRole) => void;
  setSession: (role: AccountRole, login: string, displayName: string) => void;
  logout: () => void;
};

const AccountContext = createContext<Ctx | null>(null);

function subscribeSession(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const run = () => callback();
  window.addEventListener("smg-storage", run);
  window.addEventListener("storage", run);
  return () => {
    window.removeEventListener("smg-storage", run);
    window.removeEventListener("storage", run);
  };
}

function snapshotRole(): AccountRole | null {
  if (typeof window === "undefined") return null;
  return getRole();
}

function snapshotLogin(): string | null {
  if (typeof window === "undefined") return null;
  return getLogin();
}

function snapshotDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  return getDisplayName();
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const role = useSyncExternalStore(subscribeSession, snapshotRole, () => null);
  const login = useSyncExternalStore(subscribeSession, snapshotLogin, () => null);
  const displayName = useSyncExternalStore(subscribeSession, snapshotDisplayName, () => null);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const setRole = useCallback((r: AccountRole) => {
    persistRole(r);
  }, []);

  const setSession = useCallback((r: AccountRole, userLogin: string, name: string) => {
    persistSession(r, userLogin, name);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, []);

  return (
    <AccountContext.Provider value={{ role, login, displayName, ready, setRole, setSession, logout }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const v = useContext(AccountContext);
  if (!v) throw new Error("useAccount must be used within AccountProvider");
  return v;
}
