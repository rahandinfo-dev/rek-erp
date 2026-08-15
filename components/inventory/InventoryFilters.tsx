"use client";

import { memo } from "react";
import { Search } from "lucide-react";
import type { InventorySort, InventoryStatusFilter } from "@/lib/inventory/types";

export type InventoryFilterOption = {
  id: string;
  name: string;
  symbol?: string | null;
  code?: string;
  isMain?: boolean;
};

type Props = {
  q: string;
  status: InventoryStatusFilter;
  warehouseId: string;
  unitId: string;
  sort: InventorySort;
  units: InventoryFilterOption[];
  warehouses: InventoryFilterOption[];
  onChange: (patch: {
    q?: string;
    status?: InventoryStatusFilter;
    warehouseId?: string;
    unitId?: string;
    sort?: InventorySort;
  }) => void;
};

const STATUS_OPTIONS: Array<{ value: InventoryStatusFilter; label: string }> = [
  { value: "all", label: "هەموو" },
  { value: "available", label: "بەردەست" },
  { value: "low", label: "کۆگای کەم" },
  { value: "out", label: "تەواو" },
];

const SORT_OPTIONS: Array<{ value: InventorySort; label: string }> = [
  { value: "newest", label: "نوێترین" },
  { value: "oldest", label: "کۆنترین" },
  { value: "stock_high", label: "بەرزترین کۆگا" },
  { value: "stock_low", label: "نزمترین کۆگا" },
  { value: "price_desc", label: "نرخ (بەرز→نزم)" },
  { value: "price_asc", label: "نرخ (نزم→بەرز)" },
  { value: "name", label: "ناو" },
];

function InventoryFilters({
  q,
  status,
  warehouseId,
  unitId,
  sort,
  units,
  warehouses,
  onChange,
}: Props) {
  return (
    <div className="space-y-3 rounded-3xl border border-border bg-card p-3 sm:p-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          size={16}
        />
        <input
          type="search"
          value={q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="گەڕان بە ناو، SKU یان بارکۆد..."
          className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ status: opt.value })}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              status === opt.value
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="min-w-0 space-y-1 text-xs font-semibold text-muted-foreground">
          کۆگا
          <select
            value={warehouseId}
            onChange={(e) => onChange({ warehouseId: e.target.value })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary"
          >
            <option value="">هەموو کۆگاکان</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
                {w.isMain ? " · سەرەکی" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-0 space-y-1 text-xs font-semibold text-muted-foreground">
          یەکە
          <select
            value={unitId}
            onChange={(e) => onChange({ unitId: e.target.value })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary"
          >
            <option value="">هەموو یەکەکان</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.symbol || u.name}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-0 space-y-1 text-xs font-semibold text-muted-foreground">
          ڕیزکردن
          <select
            value={sort === "price" ? "price_desc" : sort}
            onChange={(e) =>
              onChange({ sort: e.target.value as InventorySort })
            }
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

export default memo(InventoryFilters);
