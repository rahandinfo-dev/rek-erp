/** Supported company primary currencies for REK ERP. */

export const CURRENCY_CODES = ["IQD", "USD", "EUR", "GBP", "TRY"] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export type CurrencyMeta = {
  code: CurrencyCode;
  /** Kurdish Sorani display name */
  nameKu: string;
  /** Symbol or short label shown after amounts */
  symbol: string;
  /** Fraction digits for display */
  fractionDigits: number;
  /** Intl currency code (same as code for these) */
  intl: string;
};

export const CURRENCY_CATALOG: Record<CurrencyCode, CurrencyMeta> = {
  IQD: {
    code: "IQD",
    nameKu: "دیناری عێراقی",
    symbol: "د.ع",
    fractionDigits: 0,
    intl: "IQD",
  },
  USD: {
    code: "USD",
    nameKu: "دۆلار",
    symbol: "$",
    fractionDigits: 2,
    intl: "USD",
  },
  EUR: {
    code: "EUR",
    nameKu: "یۆرۆ",
    symbol: "€",
    fractionDigits: 2,
    intl: "EUR",
  },
  GBP: {
    code: "GBP",
    nameKu: "پاوەند",
    symbol: "£",
    fractionDigits: 2,
    intl: "GBP",
  },
  TRY: {
    code: "TRY",
    nameKu: "لیرەی تورکی",
    symbol: "₺",
    fractionDigits: 2,
    intl: "TRY",
  },
};

export const DEFAULT_CURRENCY: CurrencyCode = "IQD";

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return (
    typeof value === "string" &&
    (CURRENCY_CODES as readonly string[]).includes(value)
  );
}

export function resolveCurrencyCode(value: unknown): CurrencyCode {
  if (isCurrencyCode(value)) return value;
  // Legacy free-text aliases from Settings
  if (typeof value === "string") {
    const v = value.trim().toUpperCase();
    if (v === "IQD" || v === "DINAR" || v.includes("دینار")) return "IQD";
    if (v === "USD" || v === "$" || v.includes("DOLLAR")) return "USD";
    if (v === "EUR" || v === "€" || v.includes("EURO")) return "EUR";
    if (v === "GBP" || v === "£" || v.includes("POUND")) return "GBP";
    if (v === "TRY" || v === "₺" || v.includes("LIRA")) return "TRY";
  }
  return DEFAULT_CURRENCY;
}

export function getCurrencyMeta(code: unknown): CurrencyMeta {
  return CURRENCY_CATALOG[resolveCurrencyCode(code)];
}
