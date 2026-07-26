import type { PaymentMethod } from "@/lib/prisma/client";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Ù†Û•Ù‚Ø¯",
  CARD: "Ú©Ø§Ø±Øª",
  TRANSFER: "Ú¯ÙˆØ§Ø³ØªÙ†Û•ÙˆÛ•ÛŒ Ø¨Ø§Ù†Ú©ÛŒ",
  CREDIT: "Ù‚Û•Ø±Ø²",
  DIGITAL: "Ù¾Ø§Ø±Û•Ø¯Ø§Ù†ÛŒ Ø¯ÛŒØ¬ÛŒØªØ§Úµ",
  OTHER: "ØªØ±",
};

export const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(
  ([value, label]) => ({ value: value as PaymentMethod, label })
);
