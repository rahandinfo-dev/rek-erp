"use client";
import { formatNumber } from "@/lib/utils/format";
import { formatDateTime } from "@/lib/utils/datetime";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeftRight, Plus, SlidersHorizontal, Warehouse } from "lucide-react";
import { appToast } from "@/lib/toast";
import { emitNotificationsChanged } from "@/lib/notifications/bus";
import { Button } from "@/components/ui/button";
import { inputClassName, textareaClassName } from "@/components/ui/FormPrimitives";
import BarcodeScanner from "@/components/barcode/BarcodeScanner";
import type { BarcodeLookupProduct } from "@/lib/barcode/lookup";

type Option = { id: string; name: string; sku?: string; code?: string };

export type TransferHistoryRow = {
  id: string;
  referenceNo: string;
  date: string;
  reason: string | null;
  notes: string | null;
  fromWarehouse: { name: string; code?: string };
  toWarehouse: { name: string; code?: string };
  user: { fullName: string } | null;
  items: Array<{
    quantity: number;
    product: { name: string; sku: string };
  }>;
  totalQuantity?: number;
};

export default function StockTransferClient({
  products,
  warehouses,
  initialHistory,
}: {
  products: Option[];
  warehouses: Option[];
  initialHistory: TransferHistoryRow[];
}) {
  const [fromWarehouseId, setFrom] = useState(warehouses[0]?.id || "");
  const [toWarehouseId, setTo] = useState(
    warehouses[1]?.id || warehouses[0]?.id || ""
  );
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    Array<{ productId: string; quantity: number; label: string }>
  >([]);
  const [history, setHistory] = useState(initialHistory);
  const [pending, startTransition] = useTransition();

  async function loadHistory() {
    try {
      const res = await fetch("/api/inventory/transfers", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setHistory(json.data);
    } catch {
      /* ignore */
    }
  }

  function addItem() {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const qty = Number(quantity);
    if (!(qty > 0)) {
      appToast.error("بڕ نادروستە.");
      return;
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }
      return [
        ...prev,
        { productId, quantity: qty, label: `${p.name} (${p.sku})` },
      ];
    });
    setQuantity("1");
  }

  function addProductFromScan(product: BarcodeLookupProduct) {
    setProductId(product.id);
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          quantity: 1,
          label: `${product.name} (${product.sku})`,
        },
      ];
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      appToast.error("لانیکەم یەک بەرهەم زیاد بکە.");
      return;
    }
    if (reason.trim().length < 2) {
      appToast.error("هۆکار پێویستە.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/inventory/transfers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromWarehouseId,
            toWarehouseId,
            reason: reason.trim(),
            notes: notes || undefined,
            items: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            })),
          }),
        });
        const json = await res.json();
        if (!json.success) {
          appToast.error(json.message || "سەرنەکەوت.");
          return;
        }
        appToast.success("گواستنەوە تۆمارکرا", json.data?.referenceNo);
        emitNotificationsChanged({ reason: "mutation" });
        setItems([]);
        setReason("");
        setNotes("");
        await loadHistory();
      } catch {
        appToast.error("هەڵەیەک ڕوویدا.");
      }
    });
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-secondary px-3 py-1 text-sm font-bold text-primary">
            <ArrowLeftRight size={16} />
            گواستنەوەی کۆگا
          </div>
          <h1 className="text-3xl font-black text-primary sm:text-4xl">
            Warehouse Transfer
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            سەرچاوە · مەبەست · بڕ · بەکارهێنەر · بەروار · هۆکار — مێژوو هەمیشەیی
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/werehouse"
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-primary"
          >
            <Warehouse size={16} />
            کۆگاکان
          </Link>
          <Link
            href="/dashboard/inventory/adjustments"
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-primary"
          >
            <SlidersHorizontal size={16} />
            ڕێکخستن
          </Link>
          <Link
            href="/dashboard/inventory"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            ئینڤێنتۆری
          </Link>
          <Link
            href="/dashboard/inventory/history"
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-primary"
          >
            مێژووی جوڵەکان
          </Link>
        </div>
      </div>

      <form onSubmit={submit} className="rek-card space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-bold">
            کۆگای سەرچاوە (Source)
            <select
              required
              value={fromWarehouseId}
              onChange={(e) => setFrom(e.target.value)}
              className={inputClassName}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.code ? ` (${w.code})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-bold">
            کۆگای مەبەست (Destination)
            <select
              required
              value={toWarehouseId}
              onChange={(e) => setTo(e.target.value)}
              className={inputClassName}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.code ? ` (${w.code})` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-border bg-muted/20 p-3 sm:p-4">
          <p className="mb-2 text-xs font-bold text-muted-foreground">
            سکانەری بارکۆد — خۆکار زیاد دەکات بۆ گواستنەوە
          </p>
          <BarcodeScanner
            compact
            action="add"
            usbListen
            camera
            onProduct={addProductFromScan}
            onNotFound={(code) =>
              appToast.warning("بەرهەم نەدۆزرایەوە", code)
            }
            placeholder="سکان یان بارکۆد بنووسە…"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={inputClassName}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClassName}
            placeholder="بڕ"
          />
          <Button type="button" variant="outline" onClick={addItem}>
            <Plus size={16} />
            زیادکردن
          </Button>
        </div>

        {items.length > 0 ? (
          <ul className="space-y-2 rounded-2xl border border-border p-3">
            {items.map((i) => (
              <li
                key={i.productId}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>{i.label}</span>
                <span className="font-bold">{i.quantity}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <label className="block space-y-1 text-sm font-bold">
          هۆکار (Reason) *
          <input
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputClassName}
            placeholder="بۆچی ئەم گواستنەوەیە دەکرێت؟"
          />
        </label>

        <label className="block space-y-1 text-sm font-bold">
          تێبینی (ئارەزوومەندانە)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={textareaClassName}
          />
        </label>

        <Button
          type="submit"
          disabled={pending || warehouses.length < 2}
          size="lg"
          className="w-full"
        >
          <ArrowLeftRight size={18} />
          {pending ? "گواستنەوە..." : "تۆمارکردنی گواستنەوە"}
        </Button>
        {warehouses.length < 2 ? (
          <p className="text-center text-xs text-[var(--warning)]">
            پێویستت بە لانیکەم دوو کۆگا هەیە.
          </p>
        ) : null}
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-primary">
            مێژووی گواستنەوەکان
          </h2>
          <p className="text-sm text-muted-foreground">
            {history.length} تۆمار · هەمیشەیی
          </p>
        </div>

        {history.length === 0 ? (
          <div className="rek-card px-4 py-10 text-center text-sm text-muted-foreground">
            هێشتا گواستنەوە نییە.
          </div>
        ) : (
          <div className="rek-table-shell">
            <div className="rek-table-wrap">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-muted/70 text-right">
                  <tr>
                    <th className="px-3 py-3 font-bold">سەرچاوە</th>
                    <th className="px-3 py-3 font-bold">مەبەست</th>
                    <th className="px-3 py-3 font-bold">بڕ</th>
                    <th className="px-3 py-3 font-bold">بەکارهێنەر</th>
                    <th className="px-3 py-3 font-bold">بەروار</th>
                    <th className="px-3 py-3 font-bold">هۆکار</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((t) => {
                    const totalQty =
                      t.totalQuantity ??
                      t.items.reduce((s, i) => s + i.quantity, 0);
                    return (
                      <tr
                        key={t.id}
                        className="border-t border-border hover:bg-muted/40"
                      >
                        <td className="px-3 py-3">
                          <p className="font-semibold">
                            {t.fromWarehouse.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {t.referenceNo}
                          </p>
                        </td>
                        <td className="px-3 py-3 font-semibold">
                          {t.toWarehouse.name}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-black text-primary">
                            {formatNumber(totalQty)}
                          </p>
                          <p className="max-w-[200px] truncate text-[11px] text-muted-foreground">
                            {t.items
                              .map((i) => `${i.product.name} (${i.quantity})`)
                              .join(" · ")}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {t.user?.fullName || "—"}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                          {formatDateTime(t.date, true)}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-foreground">
                            {t.reason || "—"}
                          </p>
                          {t.notes ? (
                            <p className="text-[11px] text-muted-foreground">
                              {t.notes}
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
