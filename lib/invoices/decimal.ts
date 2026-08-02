/** Exact base-10 arithmetic for persisted transaction values. */
export type DecimalValue = string | number | { toString(): string };
type Parts = { coefficient: bigint; scale: number };

function parts(value: DecimalValue): Parts {
  const source = value.toString().trim();
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(source);
  if (!match) throw new Error(`Invalid decimal value: ${source}`);
  const fraction = match[3] ?? "";
  return { coefficient: (match[1] === "-" ? -1n : 1n) * BigInt(`${match[2]}${fraction}`), scale: fraction.length };
}

function render({ coefficient, scale }: Parts): string {
  const negative = coefficient < 0n;
  const digits = (negative ? -coefficient : coefficient).toString().padStart(scale + 1, "0");
  const integer = scale ? digits.slice(0, -scale) : digits;
  const fraction = scale ? digits.slice(-scale).replace(/0+$/, "") : "";
  return `${negative ? "-" : ""}${integer}${fraction ? `.${fraction}` : ""}`;
}

function align(left: Parts, right: Parts): [bigint, bigint, number] {
  const scale = Math.max(left.scale, right.scale);
  return [left.coefficient * 10n ** BigInt(scale - left.scale), right.coefficient * 10n ** BigInt(scale - right.scale), scale];
}

export function decimalString(value: DecimalValue): string { return render(parts(value)); }
export function decimalAdd(left: DecimalValue, right: DecimalValue): string {
  const [a, b, scale] = align(parts(left), parts(right));
  return render({ coefficient: a + b, scale });
}
export function decimalSubtract(left: DecimalValue, right: DecimalValue): string {
  const [a, b, scale] = align(parts(left), parts(right));
  return render({ coefficient: a - b, scale });
}
export function decimalMultiply(left: DecimalValue, right: DecimalValue): string {
  const a = parts(left); const b = parts(right);
  return render({ coefficient: a.coefficient * b.coefficient, scale: a.scale + b.scale });
}
export function decimalCompare(left: DecimalValue, right: DecimalValue): number {
  const [a, b] = align(parts(left), parts(right));
  return a < b ? -1 : a > b ? 1 : 0;
}
export function canonicalLineTotal(quantity: DecimalValue, unitPrice: DecimalValue, discount: DecimalValue): string {
  return decimalSubtract(decimalMultiply(quantity, unitPrice), discount);
}
