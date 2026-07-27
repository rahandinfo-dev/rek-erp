import { DEFAULT_LOCALE, type AppLocale, resolveLocale } from "@/lib/i18n/config";
import { ckbMessages } from "@/lib/i18n/dictionaries/ckb";
import {
  flattenMessages,
  interpolate,
  type TranslateParams,
} from "@/lib/i18n/utils";

const catalogs: Record<AppLocale, Record<string, string>> = {
  ckb: flattenMessages(ckbMessages as unknown as Record<string, unknown> as never),
};

export type MessageKey = string;

export type Translator = {
  locale: AppLocale;
  t: (key: MessageKey, params?: TranslateParams) => string;
  has: (key: MessageKey) => boolean;
};

export function createTranslator(localeInput?: string | null): Translator {
  const locale = resolveLocale(localeInput);
  const table = catalogs[locale] || catalogs[DEFAULT_LOCALE];

  return {
    locale,
    has: (key) => Boolean(table[key]),
    t: (key, params) => {
      const raw = table[key];
      if (raw == null) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[i18n] missing key: ${key}`);
        }
        return key;
      }
      return interpolate(raw, params);
    },
  };
}

/** Server-safe default translator (ckb). */
export const tServer = createTranslator(DEFAULT_LOCALE);

export function getDictionary(locale?: string | null) {
  return catalogs[resolveLocale(locale)] || catalogs[DEFAULT_LOCALE];
}
