import { formatMoneyLocalized, formatNumberLocalized } from "@/lib/i18n/format";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

type MoneyInput =
  | number
  | string
  | null
  | undefined
  | { toString(): string };

/** @deprecated Prefer formatMoneyLocalized — kept as thin wrapper for existing imports. */
export function formatMoney(value: MoneyInput) {
  return formatMoneyLocalized(value, DEFAULT_LOCALE);
}

/** @deprecated Prefer formatNumberLocalized */
export function formatNumber(value: MoneyInput, maximumFractionDigits = 2) {
  return formatNumberLocalized(value, DEFAULT_LOCALE, maximumFractionDigits);
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
