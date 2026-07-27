import { formatMoneyAmount } from "@/lib/currency/format";
import { getRuntimeCurrency } from "@/lib/currency/runtime";
import { formatNumberLocalized } from "@/lib/i18n/format";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

type MoneyInput =
  | number
  | string
  | null
  | undefined
  | { toString(): string };

/** Company-aware money formatter — uses runtime currency (Settings → دراو). */
export function formatMoney(value: MoneyInput) {
  return formatMoneyAmount(value, { currency: getRuntimeCurrency() });
}

export function formatNumber(value: MoneyInput, maximumFractionDigits = 2) {
  return formatNumberLocalized(value, DEFAULT_LOCALE, maximumFractionDigits);
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
