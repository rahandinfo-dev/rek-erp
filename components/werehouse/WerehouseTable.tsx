"use client";
import { formatNumber } from "@/lib/utils/format";

import Link from "next/link";
import { Pencil } from "lucide-react";
import DeleteWerehouseButton from "@/components/werehouse/DeleteWerehouseButton";
import BulkListShell from "@/components/bulk/BulkListShell";
import ContextMenuSurface from "@/components/quick-actions/ContextMenuSurface";

export type WarehouseRow = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isMain: boolean;
  capacity: number | null;
  capacityPct: number | null;
  inventoryValue: number;
  purchaseValue: number;
  salesValue: number;
  averageCost: number;
  currentAssetValue: number;
  availableStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryHealthScore: number;
  productsCount: number;
  usedUnits: number;
};

type Props = {
  werehouses: WarehouseRow[];
};

export default function WerehouseTable({ werehouses }: Props) {
  return (
    <BulkListShell
      moduleKey="warehouses"
      ids={werehouses.map((w) => w.id)}
      labels={Object.fromEntries(werehouses.map((w) => [w.id, w.name]))}
    >
      {({ isSelected, toggle, headerCheckbox }) => (
    <div className="space-y-3">
      <div className="grid gap-3 xl:hidden">
        {werehouses.map((item) => (
          <ContextMenuSurface
            key={item.id}
            as="article"
            className="rek-card p-4"
            record={{
              id: item.id,
              moduleKey: "warehouses",
              label: item.name,
              href: `/dashboard/werehouse/${item.id}`,
              entityType: "Warehouse",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <label className="mb-2 inline-flex items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={isSelected(item.id)}
                    onChange={() => toggle(item.id)}
                    aria-label={`Select ${item.name}`}
                  />
                  Select
                </label>
                <p className="font-black text-foreground">{item.name}</p>
                {item.isMain ? (
                  <p className="text-xs font-semibold text-primary">سەرەکی</p>
                ) : null}
              </div>
              <div className="flex gap-1.5">
                <Link
                  href={`/dashboard/werehouse/${item.id}`}
                  className="inline-flex size-9 items-center justify-center rounded-xl bg-secondary text-primary"
                  aria-label="دەستکاری"
                >
                  <Pencil size={16} />
                </Link>
                <DeleteWerehouseButton
                  id={item.id}
                  name={item.name}
                  isMain={item.isMain}
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <Stat label="بەرهەم" value={String(item.productsCount)} />
              <Stat
                label="کۆگا"
                value={formatNumber(item.availableStock)}
              />
              <Stat label="کەم" value={String(item.lowStockCount)} />
              <Stat label="تەواو" value={String(item.outOfStockCount)} />
            </div>
          </ContextMenuSurface>
        ))}
      </div>

      <div className="rek-table-shell hidden xl:block">
        <div className="rek-table-wrap">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/80 text-right">
              <tr>
                <th className="px-4 py-3 font-bold">{headerCheckbox}</th>
                <th className="px-4 py-3 font-bold">ناوی کۆگا</th>
                <th className="px-4 py-3 font-bold">بەرهەمەکان</th>
                <th className="px-4 py-3 font-bold">کۆگای ئێستا</th>
                <th className="px-4 py-3 font-bold">کۆگای کەم</th>
                <th className="px-4 py-3 font-bold">تەواو</th>
                <th className="px-4 py-3 text-center font-bold">کردار</th>
              </tr>
            </thead>
            <tbody>
              {werehouses.map((item) => (
                <ContextMenuSurface
                  key={item.id}
                  as="tr"
                  className="border-t border-border transition hover:bg-muted/40"
                  record={{
                    id: item.id,
                    moduleKey: "warehouses",
                    label: item.name,
                    href: `/dashboard/werehouse/${item.id}`,
                    entityType: "Warehouse",
                  }}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected(item.id)}
                      onChange={() => toggle(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-foreground">{item.name}</p>
                    {item.isMain ? (
                      <span className="text-[11px] font-semibold text-primary">
                        سەرەکی
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold">
                    {item.productsCount}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold">
                    {formatNumber(item.availableStock)}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-orange-700">
                    {item.lowStockCount}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-red-700">
                    {item.outOfStockCount}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1.5">
                      <Link
                        href={`/dashboard/werehouse/${item.id}`}
                        className="inline-flex size-9 items-center justify-center rounded-xl bg-secondary text-primary"
                        aria-label="دەستکاری"
                      >
                        <Pencil size={16} />
                      </Link>
                      <DeleteWerehouseButton
                  id={item.id}
                  name={item.name}
                  isMain={item.isMain}
                />
                    </div>
                  </td>
                </ContextMenuSurface>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
      )}
    </BulkListShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2">
      <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
      <p className="font-black tabular-nums text-foreground">{value}</p>
    </div>
  );
}
