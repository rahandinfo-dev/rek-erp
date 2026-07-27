"use client";
import { formatDateTime } from "@/lib/utils/datetime";

import { History } from "lucide-react";
import type { TimelineItem } from "@/components/products/ProductInventoryTimeline";
import { formatMoney, formatNumber } from "@/lib/utils/format";
import { movementTypeLabel } from "@/lib/inventory/movementLabels";
import { useT } from "@/components/i18n/LocaleProvider";

export type StockHistoryItem = TimelineItem & {
  unitCost: number | null;
};

export default function ProductStockHistory({
  items,
}: {
  items: StockHistoryItem[];
}) {
  const { t } = useT();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-12 text-center text-muted-foreground">
        {t("products.stockHistoryEmpty")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="text-primary" size={18} />
          <h3 className="text-lg font-black text-foreground">
            {t("products.stockHistoryTitle")}
          </h3>
        </div>
        <a
          href="/dashboard/inventory/history"
          className="text-xs font-bold text-primary hover:underline"
        >
          {t("products.fullHistory")}
        </a>
      </div>

      <div className="rek-table-shell">
        <div className="rek-table-wrap">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/70 text-right">
              <tr>
                <th className="px-3 py-3 font-bold">{t("products.colType")}</th>
                <th className="px-3 py-3 font-bold">{t("products.colQty")}</th>
                <th className="px-3 py-3 font-bold">{t("products.colPrev")}</th>
                <th className="px-3 py-3 font-bold">{t("products.colNew")}</th>
                <th className="px-3 py-3 font-bold">{t("products.warehouse")}</th>
                <th className="px-3 py-3 font-bold">{t("products.colCost")}</th>
                <th className="px-3 py-3 font-bold">{t("products.colUser")}</th>
                <th className="px-3 py-3 font-bold">{t("products.colTime")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const up = item.quantity >= 0;
                return (
                  <tr
                    key={item.id}
                    className="border-t border-border hover:bg-muted/40"
                  >
                    <td className="px-3 py-3 font-semibold">
                      {movementTypeLabel(item.type)}
                      {item.referenceNo ? (
                        <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                          #{item.referenceNo}
                        </span>
                      ) : null}
                    </td>
                    <td
                      className={`px-3 py-3 font-black tabular-nums ${
                        up ? "text-[var(--success)]" : "text-destructive"
                      }`}
                    >
                      {up ? "+" : ""}
                      {formatNumber(item.quantity)}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-muted-foreground">
                      {item.previousQty == null
                        ? "—"
                        : formatNumber(item.previousQty)}
                    </td>
                    <td className="px-3 py-3 tabular-nums font-semibold">
                      {item.newQty == null ? "—" : formatNumber(item.newQty)}
                    </td>
                    <td className="px-3 py-3">{item.warehouse.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                      {item.unitCost != null
                        ? `${formatMoney(item.unitCost)}`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {item.userName || "—"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(item.createdAt, true)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
