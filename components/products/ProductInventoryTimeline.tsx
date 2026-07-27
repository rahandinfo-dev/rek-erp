"use client";
import { formatNumber } from "@/lib/utils/format";
import { formatDateTime } from "@/lib/utils/datetime";

import { Clock3 } from "lucide-react";
import { useT } from "@/components/i18n/LocaleProvider";

export type TimelineItem = {
  id: string;
  type: string;
  quantity: number;
  previousQty: number | null;
  newQty: number | null;
  reason: string | null;
  referenceNo: string | null;
  notes: string | null;
  createdAt: string;
  warehouse: { name: string };
  userName: string | null;
};

const TYPE_KEYS: Record<string, string> = {
  PURCHASE: "products.movementPurchase",
  SALE: "products.movementSale",
  SALE_RETURN: "products.movementSaleReturn",
  PURCHASE_RETURN: "products.movementPurchaseReturn",
  TRANSFER_IN: "products.movementTransferIn",
  TRANSFER_OUT: "products.movementTransferOut",
  ADJUSTMENT: "products.movementAdjustment",
  PRODUCT_CREATE: "products.movementProductCreate",
  PRODUCT_DELETE: "products.movementProductDelete",
  RESTORE: "products.movementRestore",
};

export default function ProductInventoryTimeline({
  items,
}: {
  items: TimelineItem[];
}) {
  const { t } = useT();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-12 text-center text-muted-foreground">
        {t("products.timelineEmpty")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock3 className="text-primary" size={18} />
        <h3 className="text-lg font-black text-foreground">
          {t("products.timelineTitle")}
        </h3>
      </div>

      <ol className="relative space-y-0 border-r-2 border-primary/20 pr-0">
        {items.map((item, index) => {
          const delta = item.quantity;
          const up = delta >= 0;
          const typeKey = TYPE_KEYS[item.type];
          return (
            <li
              key={item.id}
              className="relative pb-6 pr-6 last:pb-0"
              style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
            >
              <span
                className={`absolute top-1.5 -right-[9px] size-4 rounded-full border-2 border-card ${
                  up ? "bg-[var(--success)]" : "bg-destructive"
                }`}
              />
              <div className="rek-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">
                      {typeKey ? t(typeKey) : item.type}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.warehouse.name}
                      {item.userName ? ` · ${item.userName}` : ""}
                      {item.referenceNo ? ` · #${item.referenceNo}` : ""}
                    </p>
                    {(item.reason || item.notes) && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {item.reason || item.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-left">
                    <p
                      className={`text-lg font-black tabular-nums ${
                        up ? "text-[var(--success)]" : "text-destructive"
                      }`}
                    >
                      {up ? "+" : ""}
                      {formatNumber(delta)}
                    </p>
                    {(item.previousQty != null || item.newQty != null) && (
                      <p className="text-[11px] text-muted-foreground">
                        {item.previousQty == null
                          ? "—"
                          : formatNumber(item.previousQty)}{" "}
                        → {item.newQty == null ? "—" : formatNumber(item.newQty)}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDateTime(item.createdAt, true)}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
