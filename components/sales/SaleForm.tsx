"use client";
import { toDateInputValue } from "@/lib/utils/datetime";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Plus, Printer, Trash2 } from "lucide-react";
import { roundMoney , formatNumber} from "@/lib/utils/format";
import { appToast } from "@/lib/toast";
import { emitNotificationsChanged } from "@/lib/notifications/bus";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/invoices/payment";
import type { PaymentMethod } from "@/app/generated/prisma/client";
import BarcodeScanner from "@/components/barcode/BarcodeScanner";
import type { BarcodeLookupProduct } from "@/lib/barcode/lookup";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { useFormHistory } from "@/lib/hooks/useFormHistory";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar, AutoSaveStatus } from "@/components/ui/AutoSaveStatus";
import ProductPicker from "@/components/forms/ProductPicker";
import { useNavigationHistory } from "@/lib/history/provider";

type Option = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  salePrice: string | number;
  currentStock: string | number;
  reservedStock: string | number;
};

type LineItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  currency: "IQD" | "USD";
};

type SaleDraft = {
  customerId: string;
  warehouseId: string;
  saleDate: string;
  discount: number;
  tax: number;
  paymentMethod: PaymentMethod;
  notes: string;
  items: LineItem[];
};

function isSaleDraftEmpty(v: SaleDraft) {
  return (
    !v.customerId &&
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
    total: 0,
    currency: "IQD",
  };
}

type SaveMode = "save" | "print" | "new";

export default function SaleForm() {
  const router = useRouter();
  const { markCreated } = useNavigationHistory();
  const searchParams = useSearchParams();
  const duplicateInvoiceId = searchParams.get("duplicate");
  const [customers, setCustomers] = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [saleDate, setSaleDate] = useState(
    toDateInputValue()
  );
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([blankLine()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const draftValue = useMemo<SaleDraft>(
    () => ({
      customerId,
      warehouseId,
      saleDate,
      discount,
      tax,
      paymentMethod,
      notes,
      items,
    }),
    [
      customerId,
      warehouseId,
      saleDate,
      discount,
      tax,
      paymentMethod,
      notes,
      items,
    ]
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
    key: DRAFT_KEYS.saleNew,
    value: draftValue,
    isEmpty: isSaleDraftEmpty,
  });

  function applySaleDraft(data: SaleDraft) {
    setCustomerId(data.customerId || "");
    setWarehouseId(data.warehouseId || "");
    setSaleDate(data.saleDate || toDateInputValue());
    setDiscount(Number(data.discount) || 0);
    setTax(Number(data.tax) || 0);
    setPaymentMethod(data.paymentMethod || "CASH");
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

  useFormHistory<SaleDraft>({
    module: "sales",
    value: draftValue,
    setValue: applySaleDraft,
    label: "Sale draft edit",
    enabled: !hasPendingDraft,
  });

  useEffect(() => {
    async function load() {
      const [cRes, wRes, pRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/werehouses"),
        fetch("/api/products"),
      ]);
      const [cJson, wJson, pJson] = await Promise.all([
        cRes.json(),
        wRes.json(),
        pRes.json(),
      ]);
      if (cJson.success) {
        setCustomers(
          cJson.data
            .filter((c: { active: boolean }) => c.active)
            .map((c: Option) => ({ id: c.id, name: c.name }))
        );
      }
      if (wJson.success) {
        const list = wJson.data.map((w: Option & { isMain?: boolean }) => ({
          id: w.id,
          name: w.name,
          isMain: w.isMain,
        }));
        setWarehouses(list);
        const main = list.find((w: { isMain?: boolean }) => w.isMain) || list[0];
        if (main && !warehouseId) setWarehouseId(main.id);
      }
      if (pJson.success) {
        setProducts(pJson.data.filter((p: { active: boolean }) => p.active));
      }

      if (duplicateInvoiceId) {
        try {
          const dRes = await fetch(
            `/api/invoices/${duplicateInvoiceId}/duplicate`
          );
          const dJson = await dRes.json();
          if (dJson.success && dJson.data) {
            applySaleDraft(dJson.data as SaleDraft);
            discardDraft();
          }
        } catch {
          /* ignore — user can still create manually */
        }
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load
  }, [duplicateInvoiceId]);

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
          if (product) next.unitPrice = Number(product.salePrice);
        }
        next.total = roundMoney(
          Math.max(0, Number(next.quantity) || 0) *
            Math.max(0, Number(next.unitPrice) || 0)
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
          salePrice: product.salePrice,
          currentStock: product.currentStock,
          reservedStock: product.reservedStock,
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
            total: roundMoney(quantity * item.unitPrice),
          };
        });
      }
      const blankIdx = prev.findIndex((i) => !i.productId);
      const line: LineItem = {
        productId: product.id,
        quantity: 1,
        unitPrice: product.salePrice,
        total: roundMoney(product.salePrice),
        currency: "IQD",
      };
      if (blankIdx >= 0) {
        return prev.map((item, i) => (i === blankIdx ? line : item));
      }
      return [...prev, line];
    });
  }

  async function submit(mode: SaveMode) {
    setError("");
    if (!warehouseId) {
      setError("کۆگا پێویستە.");
      return;
    }
    if (items.some((item) => !item.productId || item.quantity <= 0)) {
      setError("هەموو بەرهەمەکان بە تەواوی پڕبکەرەوە.");
      return;
    }
    if (items.some((item) => item.unitPrice < 0)) {
      setError("نرخ نابێت نەرێنی بێت.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || undefined,
          warehouseId,
          saleDate,
          discount,
          tax,
          paymentMethod,
          notes,
          items,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.message || "هەڵەیەک ڕوویدا.");
        appToast.error(result.message || "هەڵەیەک ڕوویدا.");
        return;
      }

      appToast.saleCompleted(
        result.data?.invoiceNo
          ? `پسوولەی ${result.data.invoiceNo} تۆمارکرا.`
          : undefined
      );
      emitNotificationsChanged({ reason: "mutation" });
      clearDraft();

      const invoiceId = result.data?.invoice?.id as string | undefined;
      const saleId = result.data?.id as string | undefined;
      const invoiceNo = result.data?.invoiceNo as string | undefined;
      if (invoiceId) {
        markCreated(
          `/dashboard/invoices/${invoiceId}`,
          invoiceNo ? `Invoice ${invoiceNo}` : "New Invoice",
          "invoices"
        );
      } else if (saleId) {
        markCreated(
          `/dashboard/sales/${saleId}`,
          invoiceNo ? `Sale ${invoiceNo}` : "New Sale",
          "sales"
        );
      }

      if (mode === "new") {
        setCustomerId("");
        setDiscount(0);
        setTax(0);
        setPaymentMethod("CASH");
        setNotes("");
        setItems([blankLine()]);
        setSaleDate(toDateInputValue());
        appToast.success("فرۆشتن تۆمارکرا", "دەستپێکردنی فرۆشتنی نوێ");
        return;
      }

      if (mode === "print" && invoiceId) {
        router.push(`/dashboard/invoices/${invoiceId}?print=1`);
        router.refresh();
        return;
      }

      router.push(
        invoiceId ? `/dashboard/invoices/${invoiceId}` : "/dashboard/sales"
      );
      router.refresh();
    } catch {
      setError("هەڵەیەک ڕوویدا.");
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary/50";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit("save");
      }}
      className="space-y-6"
    >
      <AutoSaveBar
        status={draftStatus}
        savedAt={draftSavedAt}
        hasPendingDraft={hasPendingDraft}
        pendingSavedAt={pendingDraft?.savedAt}
        onRestore={() => {
          const data = restoreDraft();
          if (data) applySaleDraft(data);
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
            کڕیار{" "}
            <span className="font-normal text-muted-foreground">(ئارەزوومەندانە)</span>
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className={inputClass}
          >
            <option value="">کڕیاری گشتی</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold">کۆگا *</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className={inputClass}
            required
          >
            <option value="">هەڵبژێرە</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold">بەرواری پسوولە</label>
          <input
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </section>

      <section className="rek-card space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black text-foreground">بەرهەمەکان</h3>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, blankLine()])}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold"
          >
            <Plus size={16} />
            زیادکردنی بەرهەم
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-bold text-muted-foreground">
            گەڕان / سکان / وێنەی بارکۆد — خۆکار زیاد دەبێت
          </p>
          <BarcodeScanner
            compact
            action="add"
            usbListen
            camera
            onProduct={addProductFromScan}
            onNotFound={(code) =>
              appToast.warning(
                "بەرهەم نەدۆزرایەوە",
                `${code} — لە بەرهەمەکان زیاد بکە`
              )
            }
            placeholder="ناو، SKU یان بارکۆد…"
          />
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const product = products.find((p) => p.id === item.productId);
            const available = product
              ? Number(product.currentStock) - Number(product.reservedStock)
              : null;

            return (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 rounded-2xl border border-border p-3 sm:grid-cols-12 sm:items-end"
              >
                <div className="sm:col-span-4">
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    بەرهەم
                  </label>
                  <ProductPicker
                    products={products}
                    value={item.productId}
                    onChange={(id) => updateItem(index, { productId: id })}
                    priceMode="sale"
                  />
                  {available != null ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      بەردەست: {available}
                    </p>
                  ) : null}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    بڕ
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    step="any"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, { quantity: Number(e.target.value) })
                    }
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    نرخ
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(index, { unitPrice: Number(e.target.value) })
                    }
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    دراو
                  </label>
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
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    کۆ
                  </label>
                  <p className="flex h-11 items-center font-black tabular-nums">
                    {formatNumber(item.total)} {item.currency}
                  </p>
                </div>
                <div className="flex gap-1 sm:col-span-1 sm:justify-end">
                  <button
                    type="button"
                    title="دووبارەکردنەوە"
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
                      title="سڕینەوە"
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
            );
          })}
        </div>
      </section>

      <section className="rek-card grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
        <div>
          <label className="mb-1.5 block text-sm font-bold">داشکاندن</label>
          <input
            type="number"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold">باج</label>
          <input
            type="number"
            min={0}
            value={tax}
            onChange={(e) => setTax(Math.max(0, Number(e.target.value) || 0))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold">شێوازی پارەدان</label>
          <select
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(e.target.value as PaymentMethod)
            }
            className={inputClass}
          >
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-2xl bg-muted/50 p-4">
          <p className="text-xs font-bold text-muted-foreground">کۆی گشتی</p>
          <p className="text-2xl font-black tabular-nums text-foreground">
            {formatNumber(total)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ژێرکۆ {formatNumber(subtotal)} − داشکاندن {formatNumber(discount)}{" "}
            + باج {formatNumber(tax)}
          </p>
        </div>
      </section>

      <section className="rek-card p-4 sm:p-6">
        <label className="mb-1.5 block text-sm font-bold">
          تێبینی{" "}
          <span className="font-normal text-muted-foreground">(ئارەزوومەندانە)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/50"
        />
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <AutoSaveStatus status={draftStatus} savedAt={draftSavedAt} />
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit("new")}
          className="h-11 rounded-2xl border border-border px-4 text-sm font-bold disabled:opacity-50"
        >
          پاشەکەوت و نوێ
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit("print")}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border px-4 text-sm font-bold disabled:opacity-50"
        >
          <Printer size={16} />
          پاشەکەوت و چاپ
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-11 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "پاشەکەوت..." : "پاشەکەوتکردنی فرۆشتن"}
        </button>
      </div>
    </form>
  );
}
