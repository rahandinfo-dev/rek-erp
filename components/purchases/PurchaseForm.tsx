"use client";
import { toDateInputValue } from "@/lib/utils/datetime";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus, Trash2 } from "lucide-react";
import { roundMoney , formatNumber} from "@/lib/utils/format";
import { appToast } from "@/lib/toast";
import { emitNotificationsChanged } from "@/lib/notifications/bus";
import BarcodeScanner from "@/components/barcode/BarcodeScanner";
import type { BarcodeLookupProduct } from "@/lib/barcode/lookup";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { useFormHistory } from "@/lib/hooks/useFormHistory";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar, AutoSaveStatus } from "@/components/ui/AutoSaveStatus";
import ProductPicker from "@/components/forms/ProductPicker";
import {
  mapActiveProductOptions,
  type ProductSelectorItem,
} from "@/lib/products/selector";
import { useNavigationHistory } from "@/lib/history/provider";
import { useT } from "@/components/i18n/LocaleProvider";
import { erpResponseError } from "@/lib/transactions/client-error";

type Option = { id: string; name: string };
type Product = ProductSelectorItem;

type LineItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  currency: "IQD" | "USD";
};

type PurchaseDraft = {
  supplierId: string;
  warehouseId: string;
  purchaseDate: string;
  discount: number;
  paidAmount: number;
  tax: number;
  notes: string;
  items: LineItem[];
};

function isPurchaseDraftEmpty(v: PurchaseDraft) {
  return (
    !v.supplierId &&
    !v.warehouseId &&
    !v.notes.trim() &&
    v.discount === 0 &&
    v.tax === 0 &&
    v.items.every((i) => !i.productId)
  );
}

function blankLine(): LineItem {
  return {
    productId: "",
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    total: 0,
    currency: "IQD",
  };
}

export default function PurchaseForm() {
  const { t } = useT();
  const router = useRouter();
  const { markCreated } = useNavigationHistory();
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    toDateInputValue()
  );
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [tax, setTax] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([blankLine()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submitLocked = useRef(false);

  const draftValue = useMemo<PurchaseDraft>(
    () => ({
      supplierId,
      warehouseId,
      purchaseDate,
      discount,
      paidAmount,
      tax,
      notes,
      items,
    }),
    [supplierId, warehouseId, purchaseDate, discount, paidAmount, tax, notes, items]
  );

  const {
    status: draftStatus,
    savedAt: draftSavedAt,
    hasPendingDraft,
    pendingDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useFormDraft({
    key: DRAFT_KEYS.purchaseNew,
    value: draftValue,
    isEmpty: isPurchaseDraftEmpty,
  });

  function applyPurchaseDraft(data: PurchaseDraft) {
    setSupplierId(data.supplierId || "");
    setWarehouseId(data.warehouseId || "");
    setPurchaseDate(
      data.purchaseDate || toDateInputValue()
    );
    setDiscount(Number(data.discount) || 0);
    setPaidAmount(Number(data.paidAmount) || 0);
    setTax(Number(data.tax) || 0);
    setNotes(data.notes || "");
    setItems(
      data.items?.length
        ? data.items.map((i) => ({
            ...blankLine(),
            ...i,
            currency: i.currency === "USD" ? "USD" : "IQD",
          }))
        : [blankLine()]
    );
  }

  useFormHistory<PurchaseDraft>({
    module: "purchases",
    value: draftValue,
    setValue: applyPurchaseDraft,
    label: t("purchases.draftEditLabel"),
    enabled: !hasPendingDraft,
  });

  useEffect(() => {
    async function load() {
      const [sRes, wRes, pRes] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/werehouses"),
        fetch("/api/products", { cache: "no-store" }),
      ]);
      const [sJson, wJson, pJson] = await Promise.all([
        sRes.json(),
        wRes.json(),
        pRes.json(),
      ]);
      if (sJson.success) {
        setSuppliers(
          sJson.data
            .filter((s: { active: boolean }) => s.active)
            .map((s: Option) => ({ id: s.id, name: s.name }))
        );
      }
      if (wJson.success) {
        const list = wJson.data as Array<Option & { isMain?: boolean }>;
        setWarehouses(list.map((w) => ({ id: w.id, name: w.name })));
        const main = list.find((w) => w.isMain) || list[0];
        if (main && !warehouseId) setWarehouseId(main.id);
      }
      if (pJson.success) {
        setProducts(mapActiveProductOptions(pJson));
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = useMemo(
    () => roundMoney(items.reduce((sum, item) => sum + item.total, 0)),
    [items]
  );
  const total = useMemo(
    () => roundMoney(subtotal - discount + tax),
    [subtotal, discount, tax]
  );

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        if (patch.productId) {
          const product = products.find((p) => p.id === patch.productId);
          if (product) next.unitPrice = Number(product.purchasePrice);
        }
        next.total = roundMoney(
          Math.max(0, Number(next.quantity) || 0) *
            Math.max(0, Number(next.unitPrice) || 0) - Math.max(0, Number(next.discount) || 0)
        );
        return next;
      })
    );
  }

  function addProductFromScan(product: BarcodeLookupProduct) {
    setProducts((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      return [
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          purchasePrice: product.purchasePrice,
          salePrice: product.salePrice,
          currentStock: product.currentStock,
          reservedStock: product.reservedStock,
          active: product.active,
        },
        ...prev,
      ];
    });
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === product.id);
      if (existingIdx >= 0) {
        return prev.map((item, i) => {
          if (i !== existingIdx) return item;
          const quantity = item.quantity + 1;
          return {
            ...item,
            quantity,
            total: roundMoney(quantity * item.unitPrice - item.discount),
          };
        });
      }
      const blankIdx = prev.findIndex((i) => !i.productId);
      const line: LineItem = {
        productId: product.id,
        quantity: 1,
        unitPrice: product.purchasePrice,
        discount: 0,
        total: roundMoney(product.purchasePrice),
        currency: "IQD",
      };
      if (blankIdx >= 0) {
        return prev.map((item, i) => (i === blankIdx ? line : item));
      }
      return [...prev, line];
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLocked.current) return;
    setError("");
    if (!warehouseId) {
      setError(t("common.warehouseRequired"));
      return;
    }
    if (items.some((item) => !item.productId || item.quantity <= 0)) {
      setError(t("common.fillAllProducts"));
      return;
    }
    try {
      submitLocked.current = true;
      setSaving(true);
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: supplierId || undefined,
          warehouseId,
          purchaseDate,
          discount,
          paidAmount,
          tax,
          notes,
          items,
        }),
      });
      if (!res.ok) {
        const message = await erpResponseError(res, t("errors.generic"));
        setError(message);
        appToast.error(message);
        return;
      }
      const result = await res.json();
      appToast.success(t("purchases.recordedTitle"), result.data?.invoiceNo || "");
      emitNotificationsChanged({ reason: "mutation" });
      clearDraft();
      const id = result.data?.id as string | undefined;
      const invoiceNo = result.data?.invoiceNo as string | undefined;
      if (id) {
        markCreated(
          `/dashboard/purchases/${id}`,
          invoiceNo ? t("purchases.historyPurchase", { no: invoiceNo }) : t("purchases.historyNewPurchase"),
          "purchases"
        );
      }
      router.push(`/dashboard/purchases/${id || ""}`);
      router.refresh();
    } catch {
      setError(t("errors.generic"));
      appToast.error(t("errors.generic"));
    } finally {
      submitLocked.current = false;
      setSaving(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary/50";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <AutoSaveBar
        status={draftStatus}
        savedAt={draftSavedAt}
        hasPendingDraft={hasPendingDraft}
        pendingSavedAt={pendingDraft?.savedAt}
        onRestore={() => {
          const data = restoreDraft();
          if (data) applyPurchaseDraft(data);
        }}
        onDiscard={discardDraft}
      />

      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="rek-card grid gap-4 p-4 sm:grid-cols-3 sm:p-6">
        <div>
          <label className="mb-1.5 block text-sm font-bold">
            {t("purchases.supplierOptional")}{" "}
            <span className="font-normal text-muted-foreground">
              {t("common.optionalHint")}
            </span>
          </label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("purchases.walkInSupplier")}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold">{t("common.warehouseStar")}</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className={inputClass}
            required
          >
            <option value="">{t("common.choose")}</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold">{t("purchases.purchaseDate")}</label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </section>

      <section className="rek-card space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black text-foreground">{t("common.products")}</h3>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, blankLine()])}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold"
          >
            <Plus size={16} />
            {t("common.addProduct")}
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-3">
          <BarcodeScanner
            compact
            action="add"
            usbListen
            camera
            onProduct={addProductFromScan}
            onNotFound={(code) =>
              appToast.warning(t("common.productNotFound"), code)
            }
            placeholder={t("common.barcodePlaceholder")}
          />
        </div>

        {items.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-1 gap-2 rounded-2xl border border-border p-3 sm:grid-cols-12 sm:items-end"
          >
            <div className="sm:col-span-3">
              <ProductPicker
                products={products}
                value={item.productId}
                onChange={(id) => updateItem(index, { productId: id })}
                priceMode="purchase"
              />
            </div>
            <div className="sm:col-span-1">
              <input
                type="number"
                min={0.01}
                step="any"
                value={item.quantity}
                onChange={(e) =>
                  updateItem(index, { quantity: Number(e.target.value) })
                }
                className={inputClass}
                placeholder={t("common.quantity")}
              />
            </div>
            <div className="sm:col-span-2">
              <input
                type="number"
                min={0}
                step="any"
                value={item.unitPrice}
                onChange={(e) =>
                  updateItem(index, { unitPrice: Number(e.target.value) })
                }
                className={inputClass}
                placeholder={t("common.cost")}
              />
            </div>
            <div className="sm:col-span-2">
              <input type="number" min={0} step="any" value={item.discount} onChange={(e) => updateItem(index, { discount: Number(e.target.value) })} className={inputClass} placeholder={t("common.discount")} />
            </div>
            <div className="sm:col-span-1">
              <select
                value={item.currency}
                onChange={(e) =>
                  updateItem(index, {
                    currency: e.target.value as "IQD" | "USD",
                  })
                }
                className={inputClass}
              >
                <option value="IQD">IQD</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <p className="flex h-11 items-center font-black tabular-nums">
                {formatNumber(item.total)} {item.currency}
              </p>
            </div>
            <div className="flex gap-1 sm:col-span-1 sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setItems((prev) => [
                    ...prev.slice(0, index + 1),
                    { ...prev[index] },
                    ...prev.slice(index + 1),
                  ])
                }
                className="inline-flex size-10 items-center justify-center rounded-xl border border-border text-primary"
              >
                <Copy size={16} />
              </button>
              {items.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-border text-destructive"
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </section>

      <section className="rek-card grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5 sm:p-6">
        <div>
          <label className="mb-1.5 block text-sm font-bold">{t("common.discount")}</label>
          <input
            type="number"
            min={0}
            value={discount}
            onChange={(e) =>
              setDiscount(Math.max(0, Number(e.target.value) || 0))
            }
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold">{t("common.tax")}</label>
          <input
            type="number"
            min={0}
            value={tax}
            onChange={(e) => setTax(Math.max(0, Number(e.target.value) || 0))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold">پارەی دراو</label>
          <input type="number" min={0} max={total} step="any" value={paidAmount} onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value) || 0))} className={inputClass} required />
          <p className="mt-1 text-xs text-muted-foreground">ماوە: {formatNumber(roundMoney(total - paidAmount))}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-4 sm:col-span-2">
          <p className="text-xs font-bold text-muted-foreground">{t("common.total")}</p>
          <p className="text-2xl font-black tabular-nums">
            {formatNumber(total)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("common.totalsBreakdown", {
              subtotal: formatNumber(subtotal),
              discount: formatNumber(discount),
              tax: formatNumber(tax),
            })}
          </p>
        </div>
      </section>

      <section className="rek-card p-4 sm:p-6">
        <label className="mb-1.5 block text-sm font-bold">{t("common.notes")}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm"
        />
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <AutoSaveStatus status={draftStatus} savedAt={draftSavedAt} />
        <button
          type="submit"
          disabled={saving}
          className="h-11 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? t("common.savingShort") : t("purchases.savePurchase")}
        </button>
      </div>
    </form>
  );
}
