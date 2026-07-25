"use client";
import { formatNumber } from "@/lib/utils/format";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { History, RefreshCw, Search } from "lucide-react";
import type { MovementHistoryRow } from "@/lib/inventory/history";
import {
  MOVEMENT_TYPE_OPTIONS,
  movementTypeLabel,
} from "@/lib/inventory/movementLabels";
import { formatStockQty } from "@/lib/inventory/stock";
import { appToast } from "@/lib/toast";
import { inputClassName } from "@/components/ui/FormPrimitives";

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type Props = {
  warehouses: Array<{ id: string; name: string; code: string }>;
  users: Array<{ id: string; fullName: string }>;
  products: Array<{ id: string; name: string; sku: string; active: boolean }>;
  initialItems: MovementHistoryRow[];
  initialPagination: Pagination;
  initialType?: string;
  initialProductId?: string;
};

export default function MovementHistoryClient({
  warehouses,
  users,
  products,
  initialItems,
  initialPagination,
  initialType = "",
  initialProductId = "",
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [pagination, setPagination] = useState(initialPagination);
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [type, setType] = useState(initialType);
  const [productId, setProductId] = useState(initialProductId);
  const [warehouseId, setWarehouseId] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(
    async (nextPage = page) => {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "25",
      });
      if (q.trim()) params.set("q", q.trim());
      if (type) params.set("type", type);
      if (productId) params.set("productId", productId);
      if (warehouseId) params.set("warehouseId", warehouseId);
      if (userId) params.set("userId", userId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      try {
        const res = await fetch(`/api/inventory/movements?${params}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!json.success) {
          appToast.error(json.message || "نوێکردنەوە سەرنەکەوت.");
          return;
        }
        startTransition(() => {
          setItems(json.data.items);
          setPagination(json.data.pagination);
          setPage(json.data.pagination.page);
        });
      } catch {
        appToast.error("نوێکردنەوە سەرنەکەوت.");
      }
    },
    [page, q, type, productId, warehouseId, userId, from, to]
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load(1);
    }, 280);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce filters only
  }, [q, type, productId, warehouseId, userId, from, to]);

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-secondary px-3 py-1 text-sm font-bold text-primary">
            <History size={16} />
            مێژووی جوڵەی ئینڤێنتۆری
          </div>
          <h1 className="text-3xl font-black text-primary sm:text-4xl">
            مێژووی جوڵەکان
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            هەموو جوڵەکان تۆمار دەکرێن · مێژوو هەرگیز ناسڕدرێتەوە
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load(page)}
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-primary"
          >
            <RefreshCw size={16} className={pending ? "animate-spin" : ""} />
            نوێکردنەوە
          </button>
          <Link
            href="/dashboard/inventory"
            className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-primary"
          >
            ئینڤێنتۆری
          </Link>
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            گەڕان
          </span>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بەرهەم، SKU، ئاماژە، هۆکار..."
              className={`${inputClassName} pr-9`}
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            جۆر
          </span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={inputClassName}
          >
            <option value="">هەموو</option>
            {MOVEMENT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            بەرهەم
          </span>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={inputClassName}
          >
            <option value="">هەموو</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}){p.active ? "" : " · سڕاوە"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            کۆگا
          </span>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className={inputClassName}
          >
            <option value="">هەموو</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            بەکارهێنەر
          </span>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className={inputClassName}
          >
            <option value="">هەموو</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            لە بەروار
          </span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputClassName}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            تا بەروار
          </span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputClassName}
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-lg font-bold text-primary">تۆماری جوڵەکان</h2>
            <p className="text-xs text-muted-foreground">
              {formatNumber(pagination.total)} تۆمار · لاپەڕە {pagination.page}{" "}
              / {pagination.totalPages}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-16 text-center text-muted-foreground">
            <History className="mx-auto text-primary/35" size={36} />
            <p className="mt-3 font-bold text-foreground">هیچ جوڵەیەک نییە</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border xl:hidden">
              {items.map((m) => (
                <li key={m.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">
                        {movementTypeLabel(m.type)}
                      </p>
                      <Link
                        href={`/dashboard/products/${m.product.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {m.product.name}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {m.date} · {m.time}
                        {m.userName ? ` · ${m.userName}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        پێشوو {formatStockQty(m.previousQty ?? 0)} → نوێ{" "}
                        {formatStockQty(m.newQty ?? 0)}
                      </p>
                      {m.reason ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          هۆکار: {m.reason}
                        </p>
                      ) : null}
                      {m.referenceNo ? (
                        <p className="mt-1 text-xs font-semibold text-foreground">
                          ئاماژە: {m.referenceNo}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {m.warehouse.name}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="rek-table-shell hidden xl:block">
              <div className="rek-table-wrap">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-muted/60 text-right">
                  <tr>
                    <th className="px-3 py-3 font-bold">جۆر</th>
                    <th className="px-3 py-3 font-bold">بەرهەم</th>
                    <th className="px-3 py-3 font-bold">بەروار</th>
                    <th className="px-3 py-3 font-bold">کات</th>
                    <th className="px-3 py-3 font-bold">بەکارهێنەر</th>
                    <th className="px-3 py-3 font-bold">بڕی پێشوو</th>
                    <th className="px-3 py-3 font-bold">بڕی نوێ</th>
                    <th className="px-3 py-3 font-bold">هۆکار</th>
                    <th className="px-3 py-3 font-bold">ژمارەی ئاماژە</th>
                    <th className="px-3 py-3 font-bold">کۆگا</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr
                      key={m.id}
                      className="border-t border-border hover:bg-muted/40"
                    >
                      <td className="px-3 py-3 font-semibold whitespace-nowrap">
                        {movementTypeLabel(m.type)}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/dashboard/products/${m.product.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {m.product.name}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          {m.product.sku}
                          {!m.product.active ? " · سڕاوە" : ""}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{m.date}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{m.time}</td>
                      <td className="px-3 py-3">{m.userName || "—"}</td>
                      <td className="px-3 py-3 font-semibold">
                        {m.previousQty == null
                          ? "—"
                          : formatStockQty(m.previousQty)}
                      </td>
                      <td className="px-3 py-3 font-semibold">
                        {m.newQty == null ? "—" : formatStockQty(m.newQty)}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-3 text-muted-foreground">
                        {m.reason || m.notes || "—"}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">
                        {m.referenceNo || "—"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {m.warehouse.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}

        {pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            <button
              type="button"
              disabled={page <= 1 || pending}
              onClick={() => void load(page - 1)}
              className="rounded-xl border border-border px-3 py-1.5 text-sm font-bold disabled:opacity-40"
            >
              پێشوو
            </button>
            <span className="text-xs text-muted-foreground">
              {page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPages || pending}
              onClick={() => void load(page + 1)}
              className="rounded-xl border border-border px-3 py-1.5 text-sm font-bold disabled:opacity-40"
            >
              دواتر
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
