export type Locale = "vi" | "en" | "zh";

export const LOCALES: Locale[] = ["vi", "en", "zh"];

export const LOCALE_STORAGE_KEY = "smg-locale";

export const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
];

export const LOCALE_HTML_LANG: Record<Locale, string> = {
  vi: "vi",
  en: "en",
  zh: "zh-CN",
};
