/** Localization config — Sorani (Central Kurdish) is default and primary. */

export const LOCALES = ["ckb"] as const;

export type AppLocale = (typeof LOCALES)[number];

/** Future locales can be added here without changing call sites. */
export const DEFAULT_LOCALE: AppLocale = "ckb";

export const LOCALE_META: Record<
  AppLocale,
  { htmlLang: string; dir: "rtl" | "ltr"; label: string; intl: string }
> = {
  ckb: {
    htmlLang: "ckb",
    dir: "rtl",
    label: "کوردی سۆرانی",
    intl: "en-US", // digit grouping stable for SSR; currency label is KU
  },
};

export function isAppLocale(value: string): value is AppLocale {
  return (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value?: string | null): AppLocale {
  if (value && isAppLocale(value)) return value;
  if (value === "ku" || value === "ckb-IQ") return "ckb";
  return DEFAULT_LOCALE;
}
