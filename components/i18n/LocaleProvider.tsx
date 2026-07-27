"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_META,
  resolveLocale,
  type AppLocale,
} from "@/lib/i18n/config";
import { createTranslator, type Translator } from "@/lib/i18n/t";
import type { TranslateParams } from "@/lib/i18n/utils";

type LocaleContextValue = Translator & {
  dir: "rtl" | "ltr";
  htmlLang: string;
  label: string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale = DEFAULT_LOCALE,
  children,
}: {
  locale?: string | null;
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const resolved = resolveLocale(locale);
    const meta = LOCALE_META[resolved];
    const tr = createTranslator(resolved);
    return {
      ...tr,
      dir: meta.dir,
      htmlLang: meta.htmlLang,
      label: meta.label,
    };
  }, [locale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    const tr = createTranslator(DEFAULT_LOCALE);
    const meta = LOCALE_META[DEFAULT_LOCALE];
    return { ...tr, dir: meta.dir, htmlLang: meta.htmlLang, label: meta.label };
  }
  return ctx;
}

export function useT() {
  const { t, locale, has } = useLocale();
  return { t, locale, has } as {
    t: (key: string, params?: TranslateParams) => string;
    locale: AppLocale;
    has: (key: string) => boolean;
  };
}
