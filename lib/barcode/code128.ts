/** Code128-safe product barcode helpers (Prisma-backed value storage). */

export function sanitizeCode128(value: string): string {
  return value
    .trim()
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, "")
    .slice(0, 48);
}

/** Generate a unique-ish Code128 value for a product. */
export function generateProductBarcode(seed?: string): string {
  const base = sanitizeCode128(seed || "");
  const stamp = Date.now().toString().slice(-10);
  const rand = Math.floor(100 + Math.random() * 900);
  if (base) {
    return sanitizeCode128(`${base}-${stamp.slice(-6)}`);
  }
  return `P${stamp}${rand}`;
}
