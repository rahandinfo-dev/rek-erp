export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_META,
  isAppLocale,
  resolveLocale,
  type AppLocale,
} from "@/lib/i18n/config";
export {
  createTranslator,
  getDictionary,
  tServer,
  type Translator,
  type MessageKey,
} from "@/lib/i18n/t";
export {
  formatMoneyLocalized,
  formatNumberLocalized,
  formatDateLocalized,
  formatDateTimeLocalized,
} from "@/lib/i18n/format";
export { interpolate, flattenMessages } from "@/lib/i18n/utils";
export type { TranslateParams } from "@/lib/i18n/utils";
