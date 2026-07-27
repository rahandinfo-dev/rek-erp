"use client";

import { memo, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Package, Warehouse } from "lucide-react";
import { formatMoney } from "@/lib/utils/format";
import { formatStockQty, getStockStatus } from "@/lib/inventory/stock";
import { StockStatusBadge } from "@/components/inventory/StockStatusBadge";
import { useQuickActionsOptional } from "@/lib/quick-actions/provider";
import type { QuickActionRecord } from "@/lib/quick-actions/types";

const ProductQuickActions = dynamic(
  () => import("@/components/products/ProductQuickActions"),
  { ssr: false }
);

export type ProductCardData = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  image: string | null;
  purchasePrice: number;
  salePrice: number;
  costPrice: number;
  profitMargin: number;
  currentStock: number;
  reservedStock: number;
  minimumStock: number;
  maximumStock: number;
  notes: string | null;
  active: boolean;
  unitId: string;
  unit: { name: string; symbol?: string | null };
  warehouseId: string;
  warehouseName: string;
};

type Props = {
  product: ProductCardData;
  onUpdated?: (product: ProductCardData) => void;
  onDeleted?: (id: string) => void;
};

function ProductCard({ product, onUpdated, onDeleted }: Props) {
  const unit = product.unit.symbol || product.unit.name;
  const status = getStockStatus(product.currentStock, product.minimumStock);
  const [actionsReady, setActionsReady] = useState(false);
  const qa = useQuickActionsOptional();

  const record = useMemo<QuickActionRecord>(
    () => ({
      id: product.id,
      moduleKey: "products",
      label: product.name,
      href: `/dashboard/products/${product.id}`,
      editHref: `/dashboard/products/${product.id}/edit`,
      entityType: "Product",
      archived: !product.active,
    }),
    [product.id, product.name, product.active]
  );

  const bind = qa ? qa.bindContextMenu(record) : null;

  function enableActions() {
    if (!actionsReady) setActionsReady(true);
  }

  function stopNav(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-sm)]"
      onMouseEnter={enableActions}
      onFocusCapture={enableActions}
      onContextMenu={bind?.onContextMenu}
      onTouchStart={bind?.onTouchStart}
      onTouchEnd={bind?.onTouchEnd}
      onTouchMove={bind?.onTouchMove}
      onFocus={bind?.onFocus}
      tabIndex={0}
    >
      <Link
        href={`/dashboard/products/${product.id}`}
        className="relative aspect-[16/10] block overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary"
        prefetch={false}
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/35">
            <Package size={36} aria-hidden />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <StockStatusBadge status={status} size="sm" />
        </div>
      </Link>

      <div className="relative flex flex-1 flex-col gap-2 p-3 pb-12 sm:p-3.5 sm:pb-12">
        <div>
          <Link
            href={`/dashboard/products/${product.id}`}
            prefetch={false}
            className="line-clamp-1 text-[15px] font-black leading-snug text-foreground transition hover:text-primary"
          >
            {product.name}
          </Link>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {product.sku}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="font-black tabular-nums text-foreground">
            {formatStockQty(product.currentStock, unit)}
          </p>
          <p className="font-black tabular-nums text-foreground">
            {formatMoney(product.salePrice)}
          </p>
        </div>

        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <Warehouse size={12} className="shrink-0" aria-hidden />
          <span className="truncate font-semibold">{product.warehouseName}</span>
        </p>

        {actionsReady ? (
          <div onClick={stopNav} onKeyDown={(e) => e.stopPropagation()}>
            <ProductQuickActions
              product={product}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
            />
          </div>
        ) : (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-11"
            aria-hidden
          />
        )}
      </div>
    </article>
  );
}

function areEqual(prev: Props, next: Props) {
  const a = prev.product;
  const b = next.product;
  return (
    prev.onUpdated === next.onUpdated &&
    prev.onDeleted === next.onDeleted &&
    a.id === b.id &&
    a.name === b.name &&
    a.sku === b.sku &&
    a.image === b.image &&
    a.salePrice === b.salePrice &&
    a.currentStock === b.currentStock &&
    a.minimumStock === b.minimumStock &&
    a.active === b.active &&
    a.warehouseName === b.warehouseName &&
    a.unit.symbol === b.unit.symbol
  );
}

export default memo(ProductCard, areEqual);
