"use client";
import { formatNumber } from "@/lib/utils/format";

import { memo } from "react";
import { AlertTriangle, Boxes, CheckCircle2, Package } from "lucide-react";
import { formatStockQty } from "@/lib/inventory/stock";
import type { InventorySummary } from "@/lib/inventory/types";

const CARDS = [
  {
    key: "productsCount" as const,
    title: "کۆی بەرهەم",
    icon: Package,
  },
  {
    key: "availableCount" as const,
    title: "بەردەست",
    icon: CheckCircle2,
  },
  {
    key: "lowStockCount" as const,
    title: "کۆگای کەم",
    icon: AlertTriangle,
  },
  {
    key: "outOfStockCount" as const,
    title: "تەواو",
    icon: Boxes,
  },
] as const;

function InventoryStats({ summary }: { summary: InventorySummary }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const alert =
            card.key === "lowStockCount"
              ? summary.lowStockCount > 0
              : card.key === "outOfStockCount"
                ? summary.outOfStockCount > 0
                : false;
          return (
            <article
              key={card.key}
              className={`rek-stat-card p-3 sm:p-4 ${
                alert && card.key === "outOfStockCount"
                  ? "border-red-200 bg-red-50/80"
                  : alert
                    ? "border-orange-200 bg-orange-50/80"
                    : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`rek-icon-box size-9 rounded-xl ${
                    card.key === "outOfStockCount" && alert
                      ? "bg-red-600 text-white"
                      : card.key === "lowStockCount" && alert
                        ? "bg-orange-500 text-white"
                        : ""
                  }`}
                >
                  <Icon size={16} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-lg font-black text-foreground sm:text-xl">
                    {formatNumber(summary[card.key])}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground sm:text-sm">
        کۆی ئێستا {formatStockQty(summary.totalCurrent)} · بەردەست{" "}
        {formatStockQty(summary.totalAvailable)} · حیجزکراو{" "}
        {formatStockQty(summary.totalReserved)}
      </p>
    </div>
  );
}

export default memo(InventoryStats);
