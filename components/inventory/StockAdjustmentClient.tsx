"use client";
import { formatDateTime } from "@/lib/utils/datetime";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  History,
  Minus,
  Plus,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { appToast } from "@/lib/toast";
import { emitNotificationsChanged } from "@/lib/notifications/bus";
import { formatStockQty } from "@/lib/inventory/stock";
import BarcodeScanner from "@/components/barcode/BarcodeScanner";
import type { BarcodeLookupProduct } from "@/lib/barcode/lookup";

type Option = { id: string; name: string; sku?: string; code?: string };

export type AdjustmentHistoryRow = {
  id: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  delta?: number;
  reason: string | null;
  notes?: string | null;
  referenceNo: string | null;
  date: string;
  product: { name: string; sku: string };
  warehouse: { name: string };
  user: { fullName: string } | null;
};

type Mode = "increase" | "decrease" | "correct";

const MODE_OPTIONS: Array<{
  value: Mode;
  label: string;
  description: string;
  icon: typeof Plus;
}> = [
  {
    value: "increase",
    label: "زیادکردنی کۆگا",
    description: "بڕ زیاد بکە",
    icon: Plus,
  },
  {
    value: "decrease",
    label: "کەمکردنی کۆگا",
    description: "بڕ کەم بکە",
    icon: Minus,
  },
  {
    value: "correct",
    label: "ڕاستکردنەوەی دەستی",
    description: "بڕی کۆتایی دابنێ",
    icon: Wrench,
  },
];

export default function StockAdjustmentClient({
  products,
  warehouses,
  initialHistory,
}: {
  products: Option[];
  warehouses: Option[];
  initialHistory: AdjustmentHistoryRow[];
}) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || "");
  const [mode, setMode] = useState<Mode>("increase");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [currentQty, setCurrentQty] = useState<number | null>(null);
  const [history, setHistory] = useState(initialHistory);
  const [pending, startTransition] = useTransition();

  const loadBalance = useCallback(async (pid: string, wid: string) => {
    if (!pid || !wid) {
      setCurrentQty(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/inventory/adjustments?balance=1&productId=${encodeURIComponent(pid)}&warehouseId=${encodeURIComponent(wid)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (json.success) setCurrentQty(Number(json.data.quantity) || 0);
    } catch {
      setCurrentQty(null);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadBalance(productId, warehouseId);
    }, 0);
    return () => window.clearTimeout(id);
  }, [productId, warehouseId, loadBalance]);

  async function loadHistory() {
    try {
      const res = await fetch("/api/inventory/adjustments", {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) setHistory(json.data);
    } catch {
      /* ignore */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 2) {
      appToast.error("هۆکار پێویستە.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/inventory/adjustments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            warehouseId,
            mode,
            quantity: Number(quantity),
            reason: reason.trim(),
            notes: notes.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          appToast.error(json.message || "سەرنەکەوت.");
          return;
        }
        appToast.inventoryAdjusted(
          `${json.data?.previousQty} → ${json.data?.newQty}`,
          json.message || "ڕێکخستن تۆمارکرا"
        );
        emitNotificationsChanged({ reason: "mutation" });
        setReason("");
        setNotes("");
        setQuantity(mode === "correct" ? "0" : "1");
        await Promise.all([loadHistory(), loadBalance(productId, warehouseId)]);
      } catch {
        appToast.error("هەڵەیەک ڕوویدا.");
      }
    });
  }

  const qtyLabel =
    mode === "correct" ? "بڕی نوێ (کۆتایی)" : "بڕی گۆڕانکاری";

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-secondary px-3 py-1 text-sm font-bold text-primary">
            <SlidersHorizontal size={16} />
            ڕێکخستنی کۆگا
          </div>
          <h1 className="text-3xl font-black text-primary sm:text-4xl">
            Stock Adjustment
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            زیادکردن · کەمکردنەوە · ڕاستکردنەوەی دەستی — هۆکار پێویستە · مێژوو
            هەمیشەیی
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/inventory/transfers"
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-primary"
          >
            <ArrowLeftRight size={16} />
            گواستنەوە
          </Link>
          <Link
            href="/dashboard/inventory/history?type=ADJUSTMENT"
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-primary"
          >
            <History size={16} />
            مێژووی تەواو
          </Link>
          <Link
            href="/dashboard/inventory"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            ئینڤێنتۆری
          </Link>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-3xl border border-border bg-card p-4 sm:p-6"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setMode(opt.value);
                  setQuantity(opt.value === "correct" ? String(currentQty ?? 0) : "1");
                }}
                className={`rounded-2xl border px-4 py-3 text-right transition ${
                  active
                    ? "border-primary bg-secondary text-primary"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <span className="inline-flex items-center gap-2 font-bold">
                  <Icon size={16} />
                  {opt.label}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-muted/20 p-3 sm:p-4">
          <p className="mb-2 text-xs font-bold text-muted-foreground">
            سکانەری بارکۆد — هەڵبژاردنی بەرهەم
          </p>
          <BarcodeScanner
            compact
            action="select"
            usbListen
            camera
            onProduct={(product: BarcodeLookupProduct) => {
              setProductId(product.id);
              appToast.success("بەرهەم هەڵبژێردرا", product.name);
            }}
            onNotFound={(code) =>
              appToast.warning("بەرهەم نەدۆزرایەوە", code)
            }
            placeholder="سکان یان بارکۆد بنووسە…"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold">
            بەرهەم
            <select
              required
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm font-semibold">
            کۆگا
            <select
              required
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.code ? ` (${w.code})` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 lg:col-span-2">
            <p className="text-xs font-bold text-muted-foreground">
              کۆگای ئێستا (ئەم کۆگایە)
            </p>
            <p className="mt-1 text-2xl font-black text-primary">
              {currentQty == null ? "…" : formatStockQty(currentQty)}
            </p>
          </div>

          <label className="space-y-1 text-sm font-semibold">
            {qtyLabel} *
            <input
              type="number"
              min={mode === "correct" ? "0" : "0.01"}
              step="0.01"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
            />
            {mode === "correct" && currentQty != null ? (
              <span className="text-xs text-muted-foreground">
                گۆڕانکاری:{" "}
                {formatStockQty(Number(quantity || 0) - currentQty)}
              </span>
            ) : null}
          </label>

          <label className="space-y-1 text-sm font-semibold">
            هۆکار * (پێویستە)
            <input
              required
              minLength={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="بۆ نموونە: ژماردنی فیزیکی / زیان / هەڵەی تۆمار"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold lg:col-span-2">
            تێبینی
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="ئارەزوومەندانە"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={pending || products.length === 0 || warehouses.length === 0}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
        >
          {mode === "decrease" ? <Minus size={18} /> : <Plus size={18} />}
          {pending ? "تۆمارکردن..." : "تۆمارکردنی ڕێکخستن"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          جوڵەکە هەمیشە دەمێنێتەوە · ئاگاداری دروست دەبێت · مێژوو ناسڕدرێتەوە
        </p>
      </form>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h2 className="font-bold text-primary">مێژووی ڕێکخستنەکان</h2>
            <p className="text-xs text-muted-foreground">
              تۆماری هەمیشەیی · دوایین {history.length}
            </p>
          </div>
          <Link
            href="/dashboard/inventory/history?type=ADJUSTMENT"
            className="text-xs font-bold text-primary hover:underline"
          >
            هەموو →
          </Link>
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            هێشتا ڕێکخستن نییە.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((h) => {
              const delta =
                h.delta ??
                Math.round((h.newQty - h.previousQty) * 100) / 100;
              return (
                <li key={h.id} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{h.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.warehouse.name} · {h.user?.fullName || "—"} ·{" "}
                        {h.referenceNo}
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        هۆکار: {h.reason || "—"}
                      </p>
                      {h.notes ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {h.notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-left">
                      <p
                        className={`font-black ${
                          delta >= 0 ? "text-[var(--success)]" : "text-destructive"
                        }`}
                      >
                        {delta > 0 ? "+" : ""}
                        {formatStockQty(delta)}
                      </p>
                      <p className="text-xs font-semibold text-foreground">
                        {formatStockQty(h.previousQty)} →{" "}
                        {formatStockQty(h.newQty)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(h.date, true)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
