"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CURRENCY_CATALOG,
  DEFAULT_CURRENCY,
  resolveCurrencyCode,
  type CurrencyCode,
  type CurrencyMeta,
} from "@/lib/currency/catalog";
import { formatMoneyAmount } from "@/lib/currency/format";
import { setRuntimeCurrency } from "@/lib/currency/runtime";
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/config";

type CurrencyContextValue = {
  currency: CurrencyCode;
  meta: CurrencyMeta;
  setCurrency: (code: CurrencyCode) => void;
  formatMoney: (
    value: number | string | null | undefined,
    options?: { style?: "symbol" | "name" | "code" }
  ) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  initialCurrency = DEFAULT_CURRENCY,
  locale = DEFAULT_LOCALE,
  children,
}: {
  initialCurrency?: string | null;
  locale?: AppLocale;
  children: ReactNode;
}) {
  const resolvedInitial = resolveCurrencyCode(initialCurrency);
  const [override, setOverride] = useState<CurrencyCode | null>(null);
  const currency = override ?? resolvedInitial;

  useEffect(() => {
    setRuntimeCurrency(currency);
  }, [currency]);

  const setCurrency = useCallback((code: CurrencyCode) => {
    const next = resolveCurrencyCode(code);
    setOverride(next);
    setRuntimeCurrency(next);
  }, []);

  const value = useMemo<CurrencyContextValue>(() => {
    const meta = CURRENCY_CATALOG[currency];
    return {
      currency,
      meta,
      setCurrency,
      formatMoney: (amount, options) =>
        formatMoneyAmount(amount, {
          currency,
          locale,
          style: options?.style,
        }),
    };
  }, [currency, locale, setCurrency]);

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    const meta = CURRENCY_CATALOG[DEFAULT_CURRENCY];
    return {
      currency: DEFAULT_CURRENCY,
      meta,
      setCurrency: () => undefined,
      formatMoney: (
        value: number | string | null | undefined,
        options?: { style?: "symbol" | "name" | "code" }
      ) =>
        formatMoneyAmount(value, {
          currency: DEFAULT_CURRENCY,
          style: options?.style,
        }),
    } satisfies CurrencyContextValue;
  }
  return ctx;
}
