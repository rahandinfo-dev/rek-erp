"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { formatMoney } from "@/lib/utils/format";
import { formatStockQty } from "@/lib/inventory/stock";
import { StockStatusBadge } from "@/components/inventory/StockStatusBadge";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import type { InventoryProductRow } from "@/lib/inventory/types";

function InventoryStockList({
  products,
  loading,
}: {
  products: InventoryProductRow[];
  loading?: boolean;
}) {
  if (loading) {
    return <CardGridSkeleton count={6} />;
  }

  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card px-4 py-14 text-center">
        <Package className="mx-auto text-primary/35" size={40} aria-hidden />
        <p className="mt-3 font-bold text-foreground">هیچ بەرهەمێک نەدۆزرایەوە</p>
        <p className="mt-1 text-sm text-muted-foreground">
          فلتەر یان گەڕان بگۆڕە.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mobile / tablet cards */}
      <div className="grid gap-3 xl:hidden">
        {products.map((p) => {
          const unit = p.unit.symbol || p.unit.name;
          return (
            <Link
              key={p.id}
              href={`/dashboard/products/${p.id}`}
              className="rek-card block p-4 transition hover:bg-muted/30"
            >
              <div className="flex gap-3">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="80px"
                      loading="lazy"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-primary/40">
                      <Package size={24} aria-hidden />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-foreground">
                        {p.name}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {p.warehouseName} · {unit}
                      </p>
                    </div>
                    <StockStatusBadge status={p.status} />
                  </div>

                  <p className="text-xl font-black tabular-nums text-foreground">
                    {formatStockQty(p.currentStock, unit)}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      کەمترین: {formatStockQty(p.minimumStock, unit)}
                    </span>
                    <span className="font-bold text-primary">
                      {formatMoney(p.salePrice)} IQD
                    </span>
                    {p.barcode ? (
                      <span className="font-mono">{p.barcode}</span>
                    ) : (
                      <span className="font-mono">{p.sku}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop table — only daily fields */}
      <div className="rek-table-shell hidden xl:block">
        <div className="rek-table-wrap">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/70 text-right">
              <tr>
                <th className="px-3 py-3 font-bold">بەرهەم</th>
                <th className="px-3 py-3 font-bold">کۆگا</th>
                <th className="px-3 py-3 font-bold">یەکە</th>
                <th className="px-3 py-3 font-bold">بڕی ئێستا</th>
                <th className="px-3 py-3 font-bold">کەمترین</th>
                <th className="px-3 py-3 font-bold">دۆخ</th>
                <th className="px-3 py-3 font-bold">فرۆشتن</th>
                <th className="px-3 py-3 font-bold">کڕین</th>
                <th className="px-3 py-3 font-bold">بارکۆد / SKU</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const unit = p.unit.symbol || p.unit.name;
                return (
                  <tr
                    key={p.id}
                    className="border-t border-border transition hover:bg-muted/40"
                  >
                    <td className="px-3 py-3">
                      <Link
                        href={`/dashboard/products/${p.id}`}
                        className="flex items-center gap-3"
                      >
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-muted">
                          {p.image ? (
                            <Image
                              src={p.image}
                              alt=""
                              fill
                              sizes="44px"
                              loading="lazy"
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-primary/35">
                              <Package size={18} aria-hidden />
                            </span>
                          )}
                        </span>
                        <span className="max-w-[200px] truncate font-bold text-foreground">
                          {p.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">{p.warehouseName}</td>
                    <td className="px-3 py-3">{unit}</td>
                    <td className="px-3 py-3 text-base font-black tabular-nums">
                      {formatStockQty(p.currentStock, unit)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatStockQty(p.minimumStock, unit)}
                    </td>
                    <td className="px-3 py-3">
                      <StockStatusBadge status={p.status} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap font-bold text-primary">
                      {formatMoney(p.salePrice)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                      {formatMoney(p.purchasePrice)}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                      {p.barcode || p.sku}
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

export default memo(InventoryStockList);
