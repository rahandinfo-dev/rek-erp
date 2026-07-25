"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import ProductStockHistory, {
  type StockHistoryItem,
} from "@/components/products/ProductStockHistory";

/**
 * Loads product stock history only when the History tab is mounted.
 * Keeps the product details SSR path free of a heavy ledger query.
 */
export default function ProductStockHistoryLazy({
  productId,
}: {
  productId: string;
}) {
  const [items, setItems] = useState<StockHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    void (async () => {
      setError(null);
      try {
        const res = await fetch(
          `/api/inventory/movements?productId=${encodeURIComponent(productId)}&pageSize=40`,
          { cache: "no-store", signal: controller.signal }
        );
        const json = await res.json();
        if (cancelled) return;
        if (!json.success) {
          setError(json.message || "بارکردنی مێژوو سەرنەکەوت.");
          setItems([]);
          return;
        }
        const rows = Array.isArray(json.data?.items) ? json.data.items : [];
        setItems(
          rows.map(
            (row: {
              id: string;
              type: string;
              quantity: number;
              previousQty: number | null;
              newQty: number | null;
              reason: string | null;
              referenceNo: string | null;
              notes: string | null;
              createdAt: string;
              warehouse?: { name: string };
              userName: string | null;
              unitCost?: number | null;
            }) => ({
              id: row.id,
              type: row.type,
              quantity: Number(row.quantity),
              previousQty:
                row.previousQty == null ? null : Number(row.previousQty),
              newQty: row.newQty == null ? null : Number(row.newQty),
              reason: row.reason,
              referenceNo: row.referenceNo,
              notes: row.notes,
              createdAt: row.createdAt,
              warehouse: { name: row.warehouse?.name || "—" },
              userName: row.userName,
              unitCost: row.unitCost == null ? null : Number(row.unitCost),
            })
          )
        );
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setError("هەڵەیەک ڕوویدا.");
        setItems([]);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [productId]);

  if (items === null) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-muted-foreground">
        <Loader2 size={18} className="animate-spin" aria-hidden />
        بارکردنی مێژوو…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </p>
    );
  }

  return <ProductStockHistory items={items} />;
}
