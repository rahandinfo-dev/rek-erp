"use client";

import { memo } from "react";
import ProductCard, {
  type ProductCardData,
} from "@/components/products/ProductCard";

function ProductGrid({
  products,
  onUpdated,
  onDeleted,
  isSelected,
  onToggleSelect,
}: {
  products: ProductCardData[];
  onUpdated?: (product: ProductCardData) => void;
  onDeleted?: (id: string) => void;
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-5 lg:grid-cols-3 2xl:grid-cols-4">
      {products.map((product) => (
        <div key={product.id} className="relative min-w-0">
          {onToggleSelect ? (
            <label className="absolute start-3 top-3 z-10 inline-flex items-center gap-2 rounded-lg bg-card/95 px-2 py-1 text-xs font-bold shadow-sm">
              <input
                type="checkbox"
                checked={isSelected?.(product.id) || false}
                onChange={() => onToggleSelect(product.id)}
                aria-label={`Select ${product.name}`}
                className="focus-visible:ring-[3px] focus-visible:ring-ring/35"
              />
              Select
            </label>
          ) : null}
          <ProductCard
            product={product}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        </div>
      ))}
    </div>
  );
}

export default memo(ProductGrid);
