import {
  DEFAULT_CURRENCY,
  resolveCurrencyCode,
  type CurrencyCode,
} from "@/lib/currency/catalog";

/**
 * Process-local default currency for formatMoney helpers.
 * Set from dashboard layout (server) and CurrencyProvider (client).
 */
let runtimeCurrency: CurrencyCode = DEFAULT_CURRENCY;

export function setRuntimeCurrency(code: string | null | undefined) {
  runtimeCurrency = resolveCurrencyCode(code);
}

export function getRuntimeCurrency(): CurrencyCode {
  return runtimeCurrency;
}
