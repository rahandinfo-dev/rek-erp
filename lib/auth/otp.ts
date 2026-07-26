import { randomInt, createHash, timingSafeEqual } from "node:crypto";

/** Cryptographically strong 6-digit OTP. */
export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

/** One-way digest for OTP at rest (same column; no schema change). */
export function hashOtp(otp: string): string {
  return createHash("sha256").update(`rek-otp:${otp}`).digest("hex");
}

export function verifyOtp(plain: string, stored: string | null | undefined): boolean {
  if (!stored || !plain) return false;
  // Backward compatible: older rows may still hold plaintext digits
  if (/^\d{6}$/.test(stored)) {
    const a = Buffer.from(stored);
    const b = Buffer.from(plain);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
  const expected = hashOtp(plain);
  const a = Buffer.from(stored);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
