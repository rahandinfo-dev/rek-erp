type MoneyInput =
  | number
  | string
  | null
  | undefined
  | { toString(): string };

export function formatMoney(value: MoneyInput) {
  const num = Number(value ?? 0);

  if (Number.isNaN(num)) {
    return "0";
  }

  return num.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

/**
 * Grouped number with an explicit locale. A bare `toLocaleString()` resolves
 * against the runtime locale, so the Node server and the browser can render
 * different digits/separators for the same value and break hydration.
 */
export function formatNumber(value: MoneyInput, maximumFractionDigits = 2) {
  const num = Number(value ?? 0);

  if (Number.isNaN(num)) {
    return "0";
  }

  return num.toLocaleString("en-US", { maximumFractionDigits });
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
