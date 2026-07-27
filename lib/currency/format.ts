import {
  getCurrencyMeta,
  resolveCurrencyCode,
  type CurrencyCode,
} from "@/lib/currency/catalog";
import { DEFAULT_LOCALE, LOCALE_META, resolveLocale, type AppLocale } from "@/lib/i18n/config";

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

export type FormatMoneyOptions = {
  currency?: CurrencyCode | string | null;
  locale?: AppLocale;
  /** Show symbol only (default) or full Kurdish name */
  style?: "symbol" | "name" | "code";
  maximumFractionDigits?: number;
};

/**
 * Format a money amount with the company currency.
 * Consistent ERP-wide — never invent exchange rates.
 */
export function formatMoneyAmount(
  value: MoneyInput,
  options: FormatMoneyOptions = {}
) {
  const meta = getCurrencyMeta(options.currency);
  const locale = resolveLocale(options.locale ?? DEFAULT_LOCALE);
  const intl = LOCALE_META[locale].intl;
  const digits =
    options.maximumFractionDigits ?? meta.fractionDigits;
  const formatted = toNum(value).toLocaleString(intl, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });

  const style = options.style ?? "symbol";
  if (style === "name") return `${formatted} ${meta.nameKu}`;
  if (style === "code") return `${formatted} ${meta.code}`;
  return `${formatted} ${meta.symbol}`;
}

export function currencyLabel(code: unknown): string {
  const meta = getCurrencyMeta(code);
  return `${meta.nameKu} (${meta.symbol})`;
}

export { resolveCurrencyCode, getCurrencyMeta };
