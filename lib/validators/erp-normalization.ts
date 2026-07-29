import { z } from "zod";

const LOCALIZED_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

export function normalizeLocalizedNumber(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const normalized = value
    .trim()
    .replace(/[٠-٩۰-۹]/g, (digit) => LOCALIZED_DIGITS[digit])
    .replace(/[٬,]/g, "")
    .replace(/٫/g, ".");
  return normalized === "" ? undefined : normalized;
}

export const erpNumber = (message: string) =>
  z.preprocess(
    normalizeLocalizedNumber,
    z.coerce.number().finite("ژمارەکە دروست نییە").nonnegative(message),
  );

export const erpPositiveNumber = (message: string) =>
  z.preprocess(
    normalizeLocalizedNumber,
    z.coerce.number().finite("ژمارەکە دروست نییە").positive(message),
  );

export const optionalTrimmedText = z.preprocess(
  (value) => (value == null ? undefined : String(value).trim() || undefined),
  z.string().max(2000, "تێبینی زۆر درێژە").optional(),
);
