import type { PaymentMethod } from "@/lib/prisma/client";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "نەقد",
  CARD: "کارت",
  TRANSFER: "گواستنەوەی بانکی",
  CREDIT: "قەرز",
  DIGITAL: "پارەدانی دیجیتاڵ",
  OTHER: "تر",
};

export const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(
  ([value, label]) => ({ value: value as PaymentMethod, label })
);
