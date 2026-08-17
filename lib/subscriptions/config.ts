export const PAYMENT_ACCOUNT_NUMBER = "07501173185";
export const PAYMENT_CONTACTS = {
  whatsappUrl: process.env.NEXT_PUBLIC_PAYMENT_WHATSAPP_URL || "https://wa.me/qr/EF7VQ7NYMDKYC1",
  telegramUrl: process.env.NEXT_PUBLIC_PAYMENT_TELEGRAM_URL || "https://t.me/rahanddyy",
  whatsappNumber: process.env.NEXT_PUBLIC_PAYMENT_WHATSAPP_NUMBER || "+96407501173185",
  telegramUsername: process.env.NEXT_PUBLIC_PAYMENT_TELEGRAM_USERNAME || "@rahanddyy",
} as const;

/** Uploaded provider QR assets. No payment URI is inferred from a screenshot. */
export const PAYMENT_QR_IMAGES = {
  superQi: "/payments/super-qi-qr.jpg",
  fastPay: process.env.NEXT_PUBLIC_PAYMENT_FASTPAY_QR_URL || "/payments/fastpay-qr.jpg",
  fib: process.env.NEXT_PUBLIC_PAYMENT_FIB_QR_URL || "/payments/fib-qr.jpg",
} as const;
