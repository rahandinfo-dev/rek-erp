import { DEFAULT_LOCALE, LOCALE_META, resolveLocale, type AppLocale } from "@/lib/i18n/config";
import { formatMoneyAmount } from "@/lib/currency/format";
import { getRuntimeCurrency } from "@/lib/currency/runtime";

type MoneyInput =
  | number
  | string
  | null
  | undefined
  | { toString(): string };

function toNum(value: MoneyInput) {
  const num = Number(value ?? 0);
  return Number.isNaN(num) ? 0 : num;
}

/**
 * Digit grouping uses a stable Intl tag for SSR hydration safety.
 */
export function formatNumberLocalized(
  value: MoneyInput,
  locale: AppLocale = DEFAULT_LOCALE,
  maximumFractionDigits = 2
) {
  const intl = LOCALE_META[resolveLocale(locale)].intl;
  return toNum(value).toLocaleString(intl, { maximumFractionDigits });
}

export function formatMoneyLocalized(
  value: MoneyInput,
  locale: AppLocale = DEFAULT_LOCALE,
  currency?: string | null
) {
  return formatMoneyAmount(value, {
    locale,
    currency: currency ?? getRuntimeCurrency(),
  });
}

export function formatDateLocalized(
  value: Date | string | number | null | undefined,
  locale: AppLocale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions
) {
  if (value == null || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  // ckb calendars vary by runtime; use Arabic-Indic-friendly options with KU month names when available
  try {
    return new Intl.DateTimeFormat("ckb-IQ", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: process.env.APP_TIME_ZONE || "Asia/Baghdad",
      ...options,
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat(LOCALE_META[locale].intl, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: process.env.APP_TIME_ZONE || "Asia/Baghdad",
      ...options,
    }).format(d);
  }
}

export function formatDateTimeLocalized(
  value: Date | string | number | null | undefined,
  locale: AppLocale = DEFAULT_LOCALE
) {
  return formatDateLocalized(value, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
