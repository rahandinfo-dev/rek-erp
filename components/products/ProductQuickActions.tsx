"use client";
import { formatNumber } from "@/lib/utils/format";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  History,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/FormPrimitives";
import { printElement } from "@/lib/export";
import { appToast } from "@/lib/toast";
import { useNavigationHistory } from "@/lib/history/provider";
import { emitNotificationsChanged } from "@/lib/notifications/bus";
import { formatStockQty } from "@/lib/inventory/stock";
import { movementTypeLabel } from "@/lib/inventory/movementLabels";
import type { ProductCardData } from "@/components/products/ProductCard";
import type { MovementHistoryRow } from "@/lib/inventory/history";

const BarcodeSvg = dynamic(() => import("@/components/barcode/BarcodeSvg"), {
  ssr: false,
  loading: () => <div className="h-10 w-full animate-pulse rounded bg-muted" />,
});

export type QuickAction =
  | "edit"
  | "delete"
  | "stock-up"
  | "stock-down"
  | "barcode"
  | "history";

type Props = {
  product: ProductCardData;
  onUpdated?: (product: ProductCardData) => void;
  onDeleted?: (id: string) => void;
};

const ACTIONS: Array<{
  id: QuickAction;
  label: string;
  icon: typeof Pencil;
  tone: string;
}> = [
  {
    id: "edit",
    label: "دەستکاری",
    icon: Pencil,
    tone: "hover:bg-primary/10 hover:text-primary",
  },
  {
    id: "delete",
    label: "سڕینەوە",
    icon: Trash2,
    tone: "hover:bg-destructive/10 hover:text-destructive",
  },
  {
    id: "stock-up",
    label: "زیادکردنی کۆگا",
    icon: Plus,
    tone: "hover:bg-[color-mix(in_srgb,var(--success)_14%,white)] hover:text-[var(--success)]",
  },
  {
    id: "stock-down",
    label: "کەمکردنی کۆگا",
    icon: Minus,
    tone: "hover:bg-amber-50 hover:text-amber-700",
  },
  {
    id: "barcode",
    label: "چاپی بارکۆد",
    icon: Printer,
    tone: "hover:bg-secondary hover:text-primary",
  },
  {
    id: "history",
    label: "مێژوو",
    icon: History,
    tone: "hover:bg-secondary hover:text-primary",
  },
];

export default memo(function ProductQuickActions({
  product,
  onUpdated,
  onDeleted,
}: Props) {
  const [panel, setPanel] = useState<Exclude<QuickAction, "delete"> | null>(
    null
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function open(action: QuickAction) {
    if (action === "delete") {
      setDeleteOpen(true);
      return;
    }
    setPanel(action);
  }

  return (
    <>
      <div className="rek-quick-actions pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 opacity-100 sm:opacity-0 sm:transition-all sm:duration-300 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <div className="pointer-events-auto flex items-center justify-between gap-1 rounded-2xl border border-border/80 bg-card/95 p-1.5 shadow-[0_10px_28px_var(--shadow-brand)] backdrop-blur-md">
          {ACTIONS.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                title={action.label}
                aria-label={action.label}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  open(action.id);
                }}
                className={`rek-quick-btn inline-flex size-9 flex-1 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 ${action.tone}`}
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      </div>

      {deleteOpen ? (
        <ConfirmDialog
          open={deleteOpen}
          title="سڕینەوەی بەرهەم"
          description={`دڵنیایت لە سڕینەوەی «${product.name}»؟ Soft delete — Undo بۆ چەند چرکەیەک · مێژوو دەمێنێتەوە.`}
          confirmText={pending ? "سڕینەوە..." : "سڕینەوە"}
          loading={pending}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => {
            startTransition(async () => {
              const snapshot = product;
              const { softDeleteWithUndo } = await import("@/lib/delete/withUndo");
              const result = await softDeleteWithUndo({
                deleteUrl: `/api/products/${product.id}`,
                restoreUrl: `/api/products/${product.id}/restore`,
                module: "products",
                title: "Product deleted",
                message: `«${product.name}»`,
                entityType: "Product",
                entityId: product.id,
                onSoftDeleted: () => {
                  setDeleteOpen(false);
                  onDeleted?.(product.id);
                },
                onRestored: () => {
                  onUpdated?.(snapshot);
                },
              });
              if (!result.ok) return;
            });
          }}
        />
      ) : null}

      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        {panel !== null ? (
          <DialogContent
            className="rek-quick-dialog max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg"
            showCloseButton
          >
            {panel === "edit" ? (
              <QuickEditPanel
                product={product}
                onClose={() => setPanel(null)}
                onUpdated={(next) => {
                  onUpdated?.(next);
                  setPanel(null);
                }}
              />
            ) : null}
            {panel === "stock-up" || panel === "stock-down" ? (
              <QuickStockPanel
                product={product}
                mode={panel === "stock-up" ? "increase" : "decrease"}
                onClose={() => setPanel(null)}
                onUpdated={(next) => {
                  onUpdated?.(next);
                  setPanel(null);
                }}
              />
            ) : null}
            {panel === "barcode" ? (
              <QuickBarcodePanel
                product={product}
                onClose={() => setPanel(null)}
                onUpdated={onUpdated}
              />
            ) : null}
            {panel === "history" ? (
              <QuickHistoryPanel
                product={product}
                onClose={() => setPanel(null)}
              />
            ) : null}
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
});

function QuickEditPanel({
  product,
  onClose,
  onUpdated,
}: {
  product: ProductCardData;
  onClose: () => void;
  onUpdated: (p: ProductCardData) => void;
}) {
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku);
  const [barcode, setBarcode] = useState(product.barcode || "");
  const [purchasePrice, setPurchasePrice] = useState(product.purchasePrice);
  const [salePrice, setSalePrice] = useState(product.salePrice);
  const [minimumStock, setMinimumStock] = useState(product.minimumStock);
  const [active, setActive] = useState(product.active);
  const [saving, setSaving] = useState(false);
  const extrasRef = useRef({
    unitId: product.unitId,
    costPrice: product.costPrice,
    profitMargin: product.profitMargin,
    currentStock: product.currentStock,
    reservedStock: product.reservedStock,
    notes: product.notes || "",
    image: product.image || "",
    maximumStock: product.maximumStock,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/products/${product.id}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!json.success || cancelled) return;
        const p = json.data;
        extrasRef.current = {
          unitId: p.unitId,
          costPrice: Number(p.costPrice),
          profitMargin: Number(p.profitMargin),
          currentStock: Number(p.currentStock),
          reservedStock: Number(p.reservedStock),
          notes: p.notes || "",
          image: p.image || "",
          maximumStock: Number(p.maximumStock ?? 0),
        };
      } catch {
        /* card data is enough to open instantly */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const extras = extrasRef.current;
      const margin =
        purchasePrice > 0
          ? ((salePrice - purchasePrice) / purchasePrice) * 100
          : extras.profitMargin;

      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim(),
          barcode: barcode.trim() || undefined,
          unitId: extras.unitId,
          purchasePrice,
          costPrice: extras.costPrice,
          salePrice,
          profitMargin: margin,
          currentStock: extras.currentStock,
          reservedStock: extras.reservedStock,
          minimumStock,
          maximumStock: extras.maximumStock ?? 0,
          notes: extras.notes || undefined,
          active,
          image: extras.image || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        appToast.error(json.message || "پاشەکەوت سەرنەکەوت.");
        return;
      }
      appToast.productSaved("بەرهەم نوێکرایەوە.");
      onUpdated({
        ...product,
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim() || null,
        purchasePrice,
        salePrice,
        profitMargin: margin,
        minimumStock,
        active,
      });
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="rek-quick-panel space-y-4">
      <DialogHeader>
        <DialogTitle>دەستکاریی خێرا</DialogTitle>
        <DialogDescription>{product.sku}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-bold sm:col-span-2">
          ناو
          <input
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClassName}
          />
        </label>
        <label className="space-y-1 text-sm font-bold">
          SKU
          <input
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className={inputClassName}
          />
        </label>
        <label className="space-y-1 text-sm font-bold">
          بارکۆد
          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className={inputClassName}
          />
        </label>
        <label className="space-y-1 text-sm font-bold">
          نرخی کڕین
          <input
            type="number"
            min={0}
            step="0.01"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(Number(e.target.value))}
            className={inputClassName}
          />
        </label>
        <label className="space-y-1 text-sm font-bold">
          نرخی فرۆشتن
          <input
            type="number"
            min={0}
            step="0.01"
            value={salePrice}
            onChange={(e) => setSalePrice(Number(e.target.value))}
            className={inputClassName}
          />
        </label>
        <label className="space-y-1 text-sm font-bold">
          ئاگاداری کۆگا
          <input
            type="number"
            min={0}
            step="0.01"
            value={minimumStock}
            onChange={(e) => setMinimumStock(Number(e.target.value))}
            className={inputClassName}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 rounded border-border"
          />
          چالاک
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          هەڵوەشاندنەوە
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "پاشەکەوت..." : "پاشەکەوت"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function QuickStockPanel({
  product,
  mode,
  onClose,
  onUpdated,
}: {
  product: ProductCardData;
  mode: "increase" | "decrease";
  onClose: () => void;
  onUpdated: (p: ProductCardData) => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState(
    mode === "increase" ? "زیادکردنی خێرا لە کارتی بەرهەم" : "کەمکردنی خێرا لە کارتی بەرهەم"
  );
  const [saving, setSaving] = useState(false);
  const up = mode === "increase";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!product.warehouseId) {
      appToast.error("کۆگا دیاری نەکراوە.");
      return;
    }
    const qty = Number(quantity);
    if (!(qty > 0)) {
      appToast.error("بڕ نادروستە.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: product.warehouseId,
          mode,
          quantity: qty,
          reason: reason.trim() || (up ? "زیادکردنی خێرا" : "کەمکردنی خێرا"),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        appToast.error(json.message || "سەرنەکەوت.");
        return;
      }
      appToast.inventoryAdjusted(
        `${json.data?.previousQty} → ${json.data?.newQty}`,
        json.message || (up ? "کۆگا زیادکرا" : "کۆگا کەمکرا")
      );
      emitNotificationsChanged({ reason: "mutation" });
      const delta = up ? qty : -qty;
      onUpdated({
        ...product,
        currentStock: Math.max(0, product.currentStock + delta),
      });
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rek-quick-panel space-y-4">
      <DialogHeader>
        <DialogTitle>{up ? "زیادکردنی خێرای کۆگا" : "کەمکردنی خێرای کۆگا"}</DialogTitle>
        <DialogDescription>
          {product.name} · ئێستا {formatStockQty(product.currentStock)} ·{" "}
          {product.warehouseName}
        </DialogDescription>
      </DialogHeader>

      <label className="space-y-1 text-sm font-bold">
        بڕ
        <input
          type="number"
          min="0.01"
          step="0.01"
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={inputClassName}
          autoFocus
        />
      </label>
      <label className="space-y-1 text-sm font-bold">
        هۆکار
        <input
          required
          minLength={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={inputClassName}
        />
      </label>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          هەڵوەشاندنەوە
        </Button>
        <Button type="submit" disabled={saving} variant={up ? "default" : "destructive"}>
          {saving ? "…" : up ? "زیادکردن" : "کەمکردن"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function QuickBarcodePanel({
  product,
  onClose,
  onUpdated,
}: {
  product: ProductCardData;
  onClose: () => void;
  onUpdated?: (p: ProductCardData) => void;
}) {
  const labelRef = useRef<HTMLDivElement>(null);
  const { markPrinted } = useNavigationHistory();
  const [barcode, setBarcode] = useState(product.barcode);
  const [busy, setBusy] = useState(false);

  async function ensureBarcode() {
    if (barcode) return barcode;
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${product.id}/barcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.success) {
        appToast.error(json.message || "دروستکردنی بارکۆد سەرنەکەوت.");
        return null;
      }
      const next = json.data.barcode as string;
      setBarcode(next);
      onUpdated?.({ ...product, barcode: next });
      return next;
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handlePrint() {
    const code = await ensureBarcode();
    if (!code || !labelRef.current) return;
    // wait a tick for svg render
    requestAnimationFrame(() => {
      if (!labelRef.current) return;
      printElement(labelRef.current, code);
      markPrinted(
        `/dashboard/products/${product.id}`,
        product.name,
        "barcode"
      );
      appToast.success("بارکۆد چاپکرا", product.name);
    });
  }

  return (
    <div className="rek-quick-panel space-y-4">
      <DialogHeader>
        <DialogTitle>چاپی بارکۆد</DialogTitle>
        <DialogDescription>{product.name}</DialogDescription>
      </DialogHeader>

      <div
        ref={labelRef}
        className="rounded-2xl border border-border bg-white px-4 py-6 text-center"
      >
        <p className="text-sm font-black text-foreground">{product.name}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {product.sku}
        </p>
        <div className="mx-auto mt-4 flex justify-center">
          {barcode ? (
            <BarcodeSvg value={barcode} height={56} displayValue />
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              بارکۆد نییە — پێش چاپ دروست دەکرێت
            </p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          داخستن
        </Button>
        <Button type="button" disabled={busy} onClick={() => void handlePrint()}>
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Printer size={16} />
          )}
          چاپ
        </Button>
      </DialogFooter>
    </div>
  );
}

function QuickHistoryPanel({
  product,
  onClose,
}: {
  product: ProductCardData;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<MovementHistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadId = useId();

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(
        `/api/inventory/movements?productId=${encodeURIComponent(product.id)}&pageSize=20`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "بارکردن سەرنەکەوت.");
        setRows([]);
        return;
      }
      const items = json.data?.items;
      setRows(Array.isArray(items) ? items : []);
    } catch {
      setError("هەڵەیەک ڕوویدا.");
      setRows([]);
    }
  }, [product.id]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const list = Array.isArray(rows) ? rows : [];

  return (
    <div className="rek-quick-panel space-y-4" data-load={loadId}>
      <DialogHeader>
        <DialogTitle>مێژووی خێرا</DialogTitle>
        <DialogDescription>
          {product.name} — دوایین جوڵەکان
        </DialogDescription>
      </DialogHeader>

      {rows === null ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" />
          چاوەڕێ…
        </div>
      ) : error ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          هیچ جوڵەیەک نییە.
        </p>
      ) : (
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto pe-1">
          {list.map((row, i) => {
            const qty = Number(row.quantity);
            const up = qty >= 0;
            return (
              <li
                key={row.id}
                className="rek-quick-history-row rounded-2xl border border-border bg-muted/30 px-3 py-2.5"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {movementTypeLabel(row.type)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.warehouse?.name || "—"} · {row.date} {row.time}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-black tabular-nums ${
                      up ? "text-[var(--success)]" : "text-destructive"
                    }`}
                  >
                    {up ? "+" : ""}
                    {formatNumber(qty)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DialogFooter>
        <Link
          href={`/dashboard/inventory/history?productId=${encodeURIComponent(product.id)}`}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-bold text-primary"
          onClick={onClose}
        >
          مێژووی تەواو
        </Link>
        <Button type="button" variant="outline" onClick={onClose}>
          داخستن
        </Button>
      </DialogFooter>
    </div>
  );
}
