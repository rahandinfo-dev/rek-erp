import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { formatStockQty, type StockStatus } from "@/lib/inventory/stock";
import { StockStatusBadge } from "@/components/inventory/StockStatusBadge";
import { tServer } from "@/lib/i18n";

export type LowStockProductRow = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minimumStock: number;
  unit: string;
  status: StockStatus;
  warehouseName: string;
};

export default function WerehouseLowStockList({
  products,
}: {
  products: LowStockProductRow[];
}) {
  const t = tServer.t;

  return (
    <section className="rek-card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-orange-500" size={22} aria-hidden />
          <h2 className="text-xl font-black text-foreground">
            {t("warehouses.lowStockTitle")}
          </h2>
        </div>
        <p className="text-sm font-semibold text-muted-foreground">
          {t("common.productsCount", { count: products.length })}
        </p>
      </div>

      {products.length === 0 ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-10 text-center text-sm font-semibold text-emerald-800">
          {t("warehouses.lowStockOk")}
        </p>
      ) : (
        <div className="rek-table-shell">
          <div className="rek-table-wrap">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/80 text-muted-foreground">
                <tr>
                  <th className="p-3 text-right font-bold">{t("warehouses.colProduct")}</th>
                  <th className="p-3 text-right font-bold">{t("warehouses.colWarehouse")}</th>
                  <th className="p-3 text-right font-bold">{t("warehouses.colCurrentQty")}</th>
                  <th className="p-3 text-right font-bold">{t("warehouses.colMinimum")}</th>
                  <th className="p-3 text-center font-bold">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3">
                      <Link
                        href={`/dashboard/products/${p.id}`}
                        className="font-bold text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">
                        {p.sku}
                      </p>
                    </td>
                    <td className="p-3">{p.warehouseName}</td>
                    <td className="p-3 text-base font-black tabular-nums">
                      {formatStockQty(p.currentStock, p.unit)}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatStockQty(p.minimumStock, p.unit)}
                    </td>
                    <td className="p-3 text-center">
                      <StockStatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
