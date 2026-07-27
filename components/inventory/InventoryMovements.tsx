"use client";
import { formatNumber } from "@/lib/utils/format";
import { formatDateTime } from "@/lib/utils/datetime";

import { memo } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import type { InventoryMovementRow } from "@/lib/inventory/types";
import { movementTypeLabel } from "@/lib/inventory/movementLabels";
import { useT } from "@/components/i18n/LocaleProvider";

function InventoryMovements({
  movements,
  loading,
}: {
  movements: InventoryMovementRow[];
  loading?: boolean;
}) {
  const { t } = useT();

  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card px-4 py-10 text-center">
        <History className="mx-auto text-primary/35" size={32} />
        <p className="mt-2 font-bold text-foreground">هیچ جوڵەیەک نییە</p>
        <Link
          href="/dashboard/inventory/history"
          className="mt-3 inline-block text-sm font-bold text-primary hover:underline"
        >
          مێژووی تەواو →
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-lg font-bold text-primary sm:text-xl">
            دوایین جوڵەکان
          </h2>
          <p className="text-xs text-muted-foreground">
            پێشوو → نوێ · بەکارهێنەر · ژمارەی ئاماژە · هەرگیز ناسڕدرێتەوە
          </p>
        </div>
        <Link
          href="/dashboard/inventory/history"
          className="shrink-0 text-xs font-bold text-primary hover:underline"
        >
          مێژووی تەواو →
        </Link>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {movements.map((m) => (
          <li key={m.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {movementTypeLabel(m.type)}
                </p>
                <Link
                  href={`/dashboard/products/${m.product.id}`}
                  className="truncate text-sm text-primary hover:underline"
                >
                  {m.product.name}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {m.warehouse.name}
                  {m.userName ? ` · ${m.userName}` : ""}
                  {m.referenceNo ? ` · ${m.referenceNo}` : ""}
                </p>
                {m.reason ? (
                  <p className="mt-1 text-xs text-muted-foreground">{m.reason}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(m.createdAt, true)}
                </p>
              </div>
              <div className="shrink-0 text-left">
                <span className="font-bold text-foreground">
                  {formatNumber(m.quantity)}
                </span>
                {m.previousQty != null && m.newQty != null ? (
                  <p className="text-[11px] text-muted-foreground">
                    {m.previousQty} → {m.newQty}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="rek-table-shell hidden md:block">
        <div className="rek-table-wrap">
        <table className="w-full min-w-[640px] text-sm lg:min-w-[760px]">
          <thead className="bg-muted/60 text-right">
            <tr>
              <th className="px-4 py-3 font-bold">جۆر</th>
              <th className="px-4 py-3 font-bold">بەرهەم</th>
              <th className="px-4 py-3 font-bold">کۆگا</th>
              <th className="px-4 py-3 font-bold">پێشوو→نوێ</th>
              <th className="px-4 py-3 font-bold">بەکارهێنەر</th>
              <th className="px-4 py-3 font-bold">ئاماژە</th>
              <th className="px-4 py-3 font-bold">بەروار</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr
                key={m.id}
                className="border-t border-border hover:bg-muted/40"
              >
                <td className="px-4 py-3 font-semibold">
                  {movementTypeLabel(m.type)}
                  {m.reason ? (
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {m.reason}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/products/${m.product.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {m.product.name}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    {m.product.sku}
                  </span>
                </td>
                <td className="px-4 py-3">{m.warehouse.name}</td>
                <td className="px-4 py-3 font-semibold whitespace-nowrap">
                  {m.previousQty != null && m.newQty != null
                    ? `${m.previousQty} → ${m.newQty}`
                    : formatNumber(m.quantity)}
                </td>
                <td className="px-4 py-3">{m.userName || "—"}</td>
                <td className="px-4 py-3">{m.referenceNo || "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {formatDateTime(m.createdAt, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

export default memo(InventoryMovements);
