"use client";
import { formatNumber } from "@/lib/utils/format";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

export type PickableProduct = {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  salePrice?: string | number;
  purchasePrice?: string | number;
  currentStock?: string | number;
  reservedStock?: string | number;
};

type Props = {
  products: PickableProduct[];
  value: string;
  onChange: (productId: string) => void;
  placeholder?: string;
  priceMode?: "sale" | "purchase";
};

/**
 * Searchable product picker — name, SKU, or barcode.
 */
export default function ProductPicker({
  products,
  value,
  onChange,
  placeholder = "گەڕان بە ناو / SKU / بارکۆد…",
  priceMode = "sale",
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = products.find((p) => p.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 40);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode || "").toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [products, query]);

  return (
    <div className="relative min-w-0">
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={open ? query : selected ? `${selected.name} (${selected.sku})` : ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange("");
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-border bg-card pr-9 pl-3 text-sm outline-none focus:border-primary/50"
          aria-label="هەڵبژاردنی بەرهەم"
          autoComplete="off"
        />
      </div>

      {open ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-[var(--shadow-md)]">
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-muted-foreground">
              هیچ بەرهەمێک نەدۆزرایەوە
            </li>
          ) : (
            filtered.map((p) => {
              const price =
                priceMode === "sale"
                  ? Number(p.salePrice ?? 0)
                  : Number(p.purchasePrice ?? 0);
              const stock =
                p.currentStock != null
                  ? Number(p.currentStock) - Number(p.reservedStock ?? 0)
                  : null;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-right text-sm hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(p.id);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <span className="font-bold text-foreground">{p.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {p.sku}
                      {p.barcode ? ` · ${p.barcode}` : ""}
                      {stock != null ? ` · بەردەست ${stock}` : ""}
                      {` · ${formatNumber(price)}`}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
