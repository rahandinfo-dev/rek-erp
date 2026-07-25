import Link from "next/link";
import { AlertTriangle, PackageX } from "lucide-react";
import { formatStockQty } from "@/lib/inventory/stock";
import { cn } from "@/lib/utils";

export type StockAlertProduct = {
  id: string;
  name: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
  warehouseName: string;
  kind: "low" | "out";
};

type Props = {
  products: StockAlertProduct[];
  className?: string;
};

/**
 * Read-only stock alerts from DB — no manual editing.
 */
export function StockAlertBanners({ products, className }: Props) {
  if (products.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)} aria-label="ئاگاداری کۆگا">
      {products.map((p) => {
        const out = p.kind === "out";
        return (
          <Link
            key={p.id}
            href={`/dashboard/products/${p.id}`}
            className={cn(
              "flex items-start gap-3 rounded-2xl border px-4 py-3 transition hover:brightness-[0.98]",
              out
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-orange-200 bg-orange-50 text-orange-950"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-white",
                out ? "bg-red-600" : "bg-orange-500"
              )}
            >
              {out ? (
                <PackageX size={18} aria-hidden />
              ) : (
                <AlertTriangle size={18} aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">
                {out ? "❌ کۆگا تەواو بووە" : "⚠️ کۆگای کەم"}
              </p>
              <p className="mt-0.5 truncate font-bold">{p.name}</p>
              <p className="mt-0.5 text-xs opacity-90">
                ماوە: {formatStockQty(p.currentStock, p.unit)}
                {out
                  ? ""
                  : ` · ئاگاداری: ${formatStockQty(p.minimumStock, p.unit)}`}
                {" · "}
                {p.warehouseName}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
