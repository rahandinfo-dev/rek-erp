export const PAYMENT_ACCOUNT_NUMBER = "07762916675";
export const PAYMENT_CONTACTS = {
  whatsappUrl: "https://wa.me/9647762916675",
  telegramUrl: "tg://resolve?phone=9647762916675",
  whatsappNumber: "07762916675",
  telegramUsername: "07762916675",
} as const;

/** Uploaded provider QR assets. No payment URI is inferred from a screenshot. */
export const PAYMENT_QR_IMAGES = {
  superQi: "/payments/super-qi-qr.jpg",
  fastPay: process.env.NEXT_PUBLIC_PAYMENT_FASTPAY_QR_URL || "/payments/fastpay-qr.jpg",
  fib: process.env.NEXT_PUBLIC_PAYMENT_FIB_QR_URL || "/payments/fib-qr.jpg",
} as const;
