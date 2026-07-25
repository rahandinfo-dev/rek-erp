"use client";

import { HeartPulse } from "lucide-react";
import {
  buildProductInventoryHealth,
  HEALTH_LABELS_KU,
} from "@/lib/inventory/health";
import {
  formatStockQty,
  STOCK_STATUS_LABELS_KU,
  stockStatusBadgeClass,
} from "@/lib/inventory/stock";
import { cn } from "@/lib/utils";

type Props = {
  currentStock: number;
  reservedStock: number;
  minimumStock: number;
  maximumStock: number;
  unitLabel: string;
};

export default function ProductInventoryHealth({
  currentStock,
  reservedStock,
  minimumStock,
  maximumStock,
  unitLabel,
}: Props) {
  const health = buildProductInventoryHealth({
    currentStock,
    reservedStock,
    minimumStock,
    maximumStock,
  });

  const scoreColor =
    health.label === "CRITICAL"
      ? "text-destructive"
      : health.label === "ATTENTION"
        ? "text-[var(--warning)]"
        : "text-[var(--success)]";

  const barColor =
    health.label === "CRITICAL"
      ? "bg-destructive"
      : health.label === "ATTENTION"
        ? "bg-[var(--warning)]"
        : "bg-[var(--success)]";

  return (
    <section className="rek-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rek-icon-box size-11">
            <HeartPulse size={20} aria-hidden />
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground">
              تەندروستی ئینڤێنتۆری
            </h3>
            <p className="text-sm text-muted-foreground">
              هەڵسەنگاندن لەسەر کۆگا، کەمترین و زۆرترین ئاست
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={stockStatusBadgeClass(health.status)}>
            {STOCK_STATUS_LABELS_KU[health.status]}
          </span>
          <span
            className={cn(
              "rek-badge",
              health.label === "CRITICAL"
                ? "rek-badge-danger"
                : health.label === "ATTENTION"
                  ? "rek-badge-warning"
                  : "rek-badge-success"
            )}
          >
            {HEALTH_LABELS_KU[health.label]}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">ئاستی تەندروستی</p>
          <p className={cn("text-4xl font-black tabular-nums", scoreColor)}>
            {health.score}
            <span className="text-lg text-muted-foreground">/100</span>
          </p>
        </div>
        <div className="min-w-[180px] flex-1">
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", barColor)}
              style={{ width: `${health.score}%` }}
            />
          </div>
          {health.fillPct != null && (
            <p className="mt-2 text-xs text-muted-foreground">
              پڕبوونی کۆگا بەرامبەر زۆرترین: {health.fillPct}% ·{" "}
              {formatStockQty(currentStock, unitLabel)} /{" "}
              {formatStockQty(maximumStock, unitLabel)}
            </p>
          )}
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {health.messages.map((msg) => (
          <li
            key={msg}
            className="rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground"
          >
            {msg}
          </li>
        ))}
      </ul>
    </section>
  );
}
