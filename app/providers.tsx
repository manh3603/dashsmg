"use client";

import { AccountProvider } from "@/context/AccountContext";
import { LanguageProvider } from "@/context/LanguageContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AccountProvider>{children}</AccountProvider>
    </LanguageProvider>
  );
}
