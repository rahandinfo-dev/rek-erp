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

/**
 * Formats a quantity and its unit as one bidi-isolated display value.
 * This keeps number → unit order stable inside both RTL and LTR containers.
 */
export function formatQuantityWithUnit(
  value: MoneyInput,
  unit?: string | null,
  maximumFractionDigits = 2
) {
  const quantity = formatNumber(value, maximumFractionDigits);
  const label = unit?.trim();
  if (!label) return quantity;

  // SI-style symbols stay attached (1m); word units retain a readable gap.
  const compactSymbol = /^(?:[kMGTmunµ]?g|[kcm]?m(?:[²³])?|[kM]?L|ml)$/u.test(label);
  const separator = compactSymbol ? "" : "\u00A0";

  // LRI/PDI prevents RTL bidi resolution from displaying `unit number`.
  return `\u2066${quantity}${separator}${label}\u2069`;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
