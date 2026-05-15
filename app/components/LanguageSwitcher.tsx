"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LOCALE_OPTIONS, type Locale } from "@/lib/i18n/types";

const LOCALE_SHORT: Record<Locale, string> = {
  vi: "VI",
  en: "EN",
  zh: "中文",
};

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-violet-800/50 bg-zinc-900/80 px-3 py-1.5 text-sm text-slate-200 shadow-lg shadow-black/20 hover:border-violet-600/50 hover:bg-zinc-900"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.select")}
      >
        <Globe className="h-4 w-4 shrink-0 text-violet-300" aria-hidden />
        <span className="font-medium">{LOCALE_SHORT[locale]}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t("lang.select")}
          className="absolute right-0 z-50 mt-2 min-w-[10.5rem] overflow-hidden rounded-xl border border-violet-800/50 bg-zinc-900 py-1 shadow-xl shadow-black/40"
        >
          {LOCALE_OPTIONS.map((opt) => {
            const selected = opt.value === locale;
            return (
              <li key={opt.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    setLocale(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    selected ? "bg-violet-600/20 text-white" : "text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <span>{opt.label}</span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-fuchsia-300" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
