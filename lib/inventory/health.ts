import {
  getAvailableStock,
  getStockStatus,
  type StockStatus,
} from "@/lib/inventory/stock";

export type InventoryHealthLabel = "HEALTHY" | "ATTENTION" | "CRITICAL";

export type ProductInventoryHealth = {
  score: number;
  label: InventoryHealthLabel;
  status: StockStatus;
  availableStock: number;
  fillPct: number | null;
  messages: string[];
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Per-product inventory health from Prisma stock fields.
 * Score 0–100; CRITICAL when out, ATTENTION when low or near max.
 */
export function buildProductInventoryHealth(input: {
  currentStock: unknown;
  reservedStock?: unknown;
  minimumStock: unknown;
  maximumStock?: unknown;
}): ProductInventoryHealth {
  const current = num(input.currentStock);
  const reserved = Math.max(0, num(input.reservedStock));
  const minimum = Math.max(0, num(input.minimumStock));
  const maximum = Math.max(0, num(input.maximumStock));
  const available = getAvailableStock(current, reserved);
  const status = getStockStatus(current, minimum);

  const messages: string[] = [];
  let score = 100;

  if (status === "OUT_OF_STOCK") {
    score = 12;
    messages.push("کۆگا تەواوە — پێویستی بە پڕکردنەوە هەیە.");
  } else if (status === "LOW_STOCK") {
    score = Math.max(28, Math.round(45 * (current / Math.max(minimum, 1))));
    messages.push("کۆگا لە ژێر کەمترین ئاستدایە.");
  } else {
    score = 88;
    messages.push("کۆگا لە دۆخی باشدایە.");
  }

  if (reserved > 0 && available <= minimum) {
    score = Math.min(score, 40);
    messages.push("بەردەست کەمە بەهۆی حیجز.");
  }

  let fillPct: number | null = null;
  if (maximum > 0) {
    fillPct = Math.min(100, Math.round((current / maximum) * 1000) / 10);
    if (fillPct >= 95) {
      score = Math.min(score, 55);
      messages.push("کۆگا نزیکە لە زۆرترین ئاست.");
    } else if (fillPct >= 80 && status === "IN_STOCK") {
      score = Math.min(score, 72);
      messages.push("کۆگا بەرزە — چاودێری توانا بکە.");
    }
  }

  let label: InventoryHealthLabel = "HEALTHY";
  if (score < 40) label = "CRITICAL";
  else if (score < 70) label = "ATTENTION";

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    label,
    status,
    availableStock: available,
    fillPct,
    messages,
  };
}

export const HEALTH_LABELS_KU: Record<InventoryHealthLabel, string> = {
  HEALTHY: "تەندروست",
  ATTENTION: "پێویستی بە سەرنجدان",
  CRITICAL: "مەترسیدار",
};
