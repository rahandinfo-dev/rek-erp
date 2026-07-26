"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Barcode,
  Boxes,
  History,
  ImageIcon,
  Info,
  Package,
  Pencil,
  RotateCcw,
  Save,
  Trash2,
  Warehouse,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import ProductStockHistoryLazy from "@/components/products/ProductStockHistoryLazy";
import { formatMoney } from "@/lib/utils/format";
import { appToast } from "@/lib/toast";
import {
  formatStockQty,
  getStockSnapshot,
} from "@/lib/inventory/stock";
import { StockStatusBadge } from "@/components/inventory/StockStatusBadge";
import { inputClassName } from "@/components/ui/FormPrimitives";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const BarcodeSvg = dynamic(() => import("@/components/barcode/BarcodeSvg"), {
  ssr: false,
  loading: () => (
    <div className="h-16 w-48 animate-pulse rounded-lg bg-muted" aria-hidden />
  ),
});

const VersionHistoryPanel = dynamic(
  () => import("@/components/versions/VersionHistoryPanel"),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">Loading versions…</p>
    ),
  }
);

type Option = { id: string; name: string; symbol?: string | null };

export type ProductDetailsData = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  image: string | null;
  notes: string | null;
  active: boolean;
  purchasePrice: number;
  costPrice: number;
  salePrice: number;
  profitMargin: number;
  currentStock: number;
  reservedStock: number;
  minimumStock: number;
  maximumStock: number;
  unitId: string;
  unit: { id: string; name: string; symbol: string | null };
  warehouseName: string;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseBalance = {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reserved: number;
  isMain: boolean;
};

type TabId =
  | "general"
  | "inventory"
  | "pricing"
  | "history"
  | "versions"
  | "barcode"
  | "images";

const TABS: { id: TabId; label: string; icon: typeof Info }[] = [
  { id: "general", label: "گشتی", icon: Info },
  { id: "inventory", label: "کۆگا", icon: Boxes },
  { id: "pricing", label: "نرخ", icon: Package },
  { id: "barcode", label: "بارکۆد", icon: Barcode },
  { id: "history", label: "مێژوو", icon: History },
  { id: "versions", label: "وەشانەکان", icon: History },
  { id: "images", label: "وێنە", icon: ImageIcon },
];

type Props = {
  product: ProductDetailsData;
  units: Option[];
  warehouseBalances?: WarehouseBalance[];
};

export default function ProductDetails({
  product: initial,
  units,
  warehouseBalances = [],
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("general");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const [, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: initial.name,
    sku: initial.sku,
    barcode: initial.barcode ?? "",
    unitId: initial.unitId,
    purchasePrice: initial.purchasePrice,
    costPrice: initial.costPrice,
    salePrice: initial.salePrice,
    profitMargin: initial.profitMargin,
    currentStock: initial.currentStock,
    reservedStock: initial.reservedStock,
    minimumStock: initial.minimumStock,
    maximumStock: initial.maximumStock,
    notes: initial.notes ?? "",
    image: initial.image ?? "",
    active: initial.active,
  });

  const [product, setProduct] = useState(initial);

  const unitLabel = useMemo(() => {
    const u = units.find((x) => x.id === form.unitId) || product.unit;
    return u.symbol || u.name;
  }, [form.unitId, units, product.unit]);

  const stock = useMemo(
    () =>
      getStockSnapshot({
        currentStock: form.currentStock,
        reservedStock: form.reservedStock,
        minimumStock: form.minimumStock,
        maximumStock: form.maximumStock,
      }),
    [
      form.currentStock,
      form.reservedStock,
      form.minimumStock,
      form.maximumStock,
    ]
  );

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          barcode: form.barcode || undefined,
          notes: form.notes || undefined,
          image: form.image || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }

      const p = data.data;
      const updatedAt =
        typeof p.updatedAt === "string"
          ? p.updatedAt
          : new Date(p.updatedAt).toISOString();
      setProduct({
        ...product,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        image: p.image,
        notes: p.notes,
        active: p.active,
        purchasePrice: Number(p.purchasePrice),
        costPrice: Number(p.costPrice),
        salePrice: Number(p.salePrice),
        profitMargin: Number(p.profitMargin),
        currentStock: Number(p.currentStock),
        reservedStock: Number(p.reservedStock),
        minimumStock: Number(p.minimumStock),
        maximumStock: Number(p.maximumStock ?? form.maximumStock),
        unitId: p.unitId,
        unit: {
          id: p.unit.id,
          name: p.unit.name,
          symbol: p.unit.symbol ?? null,
        },
        updatedAt,
      });
      setForm((prev) => ({
        ...prev,
        maximumStock: Number(p.maximumStock ?? prev.maximumStock),
      }));
      setEditing(false);
      appToast.productSaved("گۆڕانکارییەکان پاشەکەوتکران.");
      startTransition(() => router.refresh());
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
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
          setConfirmOpen(false);
          setProduct((prev) => ({ ...prev, active: false }));
          setForm((prev) => ({ ...prev, active: false }));
          router.push("/dashboard/products");
          router.refresh();
        },
        onRestored: () => {
          router.push(`/dashboard/products/${product.id}`);
          router.refresh();
        },
      });
      if (!result.ok) return;
    } finally {
      setDeleting(false);
    }
  }

  async function handleRestore() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${product.id}/restore`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) {
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }
      appToast.success("بەرهەم گەڕێنرایەوە", data.message);
      setProduct((prev) => ({ ...prev, active: true }));
      setForm((prev) => ({ ...prev, active: true }));
      startTransition(() => router.refresh());
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setDeleting(false);
    }
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "product");
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json();
      const url = data.data?.url as string | undefined;
      if (!data.success || !url) {
        appToast.error(data.message || "بارکردنی وێنە سەرنەکەوت.");
        return;
      }
      update("image", url);
      appToast.productSaved("وێنە بارکرا — پاشەکەوت بکە.");
    } catch {
      appToast.error("بارکردنی وێنە سەرنەکەوت.");
    } finally {
      setUploading(false);
    }
  }

  async function generateBarcode(regenerate = false) {
    setBarcodeBusy(true);
    try {
      const res = await fetch(`/api/products/${product.id}/barcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
      });
      const data = await res.json();
      if (!data.success) {
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }
      const code = data.data?.barcode || "";
      update("barcode", code);
      setProduct((p) => ({ ...p, barcode: code }));
      appToast.productSaved(data.message || "بارکۆد پاشەکەوتکرا.");
      startTransition(() => router.refresh());
    } catch {
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setBarcodeBusy(false);
    }
  }

  function cancelEdit() {
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode ?? "",
      unitId: product.unitId,
      purchasePrice: product.purchasePrice,
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      profitMargin: product.profitMargin,
      currentStock: product.currentStock,
      reservedStock: product.reservedStock,
      minimumStock: product.minimumStock,
      maximumStock: product.maximumStock,
      notes: product.notes ?? "",
      image: product.image ?? "",
      active: product.active,
    });
    setEditing(false);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowRight size={16} />
          گەڕانەوە بۆ بەرهەمەکان
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <Button type="button" variant="outline" onClick={cancelEdit}>
                هەڵوەشاندنەوە
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                <Save size={16} />
                {saving ? "پاشەکەوت..." : "پاشەکەوتکردنی گۆڕانکاری"}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => setEditing(true)}>
              <Pencil size={16} />
              دەستکاری
            </Button>
          )}
          {product.active ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 size={16} />
              سڕینەوە
            </Button>
          ) : (
            <Button
              type="button"
              disabled={deleting}
              onClick={() => void handleRestore()}
            >
              <RotateCcw size={16} />
              {deleting ? "گەڕاندنەوە..." : "گەڕاندنەوە"}
            </Button>
          )}
        </div>
      </div>

      {/* Hero */}
      <section className="rek-product-hero rek-card overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,360px)_1fr]">
          <div className="relative min-h-[240px] bg-gradient-to-br from-secondary via-white to-muted lg:min-h-[360px]">
            {(editing ? form.image : product.image) ? (
              <Image
                src={(editing ? form.image : product.image) || ""}
                alt={form.name}
                fill
                className="object-cover"
                sizes="360px"
              />
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center text-primary/30">
                <Package size={72} />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StockStatusBadge status={stock.status} size="lg" />
              </div>

              {editing ? (
                <input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className={cn(inputClassName, "text-2xl font-black")}
                />
              ) : (
                <h1 className="text-3xl font-black text-foreground sm:text-4xl">
                  {product.name}
                </h1>
              )}

              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Warehouse size={16} className="text-primary" aria-hidden />
                {product.warehouseName}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {(editing ? form.barcode : product.barcode) ||
                  `SKU: ${editing ? form.sku : product.sku}`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat
                label="بڕی ئێستا"
                value={formatStockQty(stock.currentStock, unitLabel)}
              />
              <Stat
                label="ئاگاداری کۆگا"
                value={formatStockQty(stock.minimumStock, unitLabel)}
              />
              <Stat
                label="نرخی فرۆشتن"
                value={`${formatMoney(form.salePrice)} IQD`}
              />
              <Stat
                label="نرخی کڕین"
                value={`${formatMoney(form.purchasePrice)} IQD`}
              />
              <Stat label="یەکە" value={unitLabel} />
              <Stat label="کۆگا" value={product.warehouseName} icon />
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="rek-tabs-scroll">
        <div className="inline-flex min-w-full gap-1.5 rounded-[1.5rem] border border-border bg-card p-2 shadow-[var(--shadow-xs)] sm:min-w-0 sm:flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition sm:flex-none sm:px-4",
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-[var(--shadow-brand)]"
                    : "text-muted-foreground hover:bg-secondary hover:text-primary"
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rek-product-tab rek-card p-6 sm:p-8">
        {tab === "general" && (
          <div className="space-y-6">
            <SectionTitle>زانیاری گشتی</SectionTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="SKU">
                {editing ? (
                  <input
                    value={form.sku}
                    onChange={(e) => update("sku", e.target.value)}
                    className={inputClassName}
                  />
                ) : (
                  <Value>{product.sku}</Value>
                )}
              </Field>
              <Field label="بارکۆد">
                {editing ? (
                  <input
                    value={form.barcode}
                    onChange={(e) => update("barcode", e.target.value)}
                    className={inputClassName}
                  />
                ) : (
                  <Value>{product.barcode || "—"}</Value>
                )}
              </Field>
              <Field label="یەکە">
                {editing ? (
                  <select
                    value={form.unitId}
                    onChange={(e) => update("unitId", e.target.value)}
                    className={inputClassName}
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Value>
                    {product.unit.name}
                    {product.unit.symbol ? ` (${product.unit.symbol})` : ""}
                  </Value>
                )}
              </Field>
              <Field label="کۆگا">
                <Value>{product.warehouseName}</Value>
              </Field>
              <Field label="نرخی کڕین">
                {editing ? (
                  <input
                    type="number"
                    value={form.purchasePrice}
                    onChange={(e) =>
                      update("purchasePrice", Number(e.target.value))
                    }
                    className={inputClassName}
                  />
                ) : (
                  <Value>{formatMoney(product.purchasePrice)} IQD</Value>
                )}
              </Field>
              <Field label="نرخی فرۆشتن">
                {editing ? (
                  <input
                    type="number"
                    value={form.salePrice}
                    onChange={(e) =>
                      update("salePrice", Number(e.target.value))
                    }
                    className={inputClassName}
                  />
                ) : (
                  <Value>{formatMoney(product.salePrice)} IQD</Value>
                )}
              </Field>
              <Field label="تێچوون">
                {editing ? (
                  <input
                    type="number"
                    value={form.costPrice}
                    onChange={(e) =>
                      update("costPrice", Number(e.target.value))
                    }
                    className={inputClassName}
                  />
                ) : (
                  <Value>{formatMoney(product.costPrice)} IQD</Value>
                )}
              </Field>
              <Field label="قازانج %">
                {editing ? (
                  <input
                    type="number"
                    value={form.profitMargin}
                    onChange={(e) =>
                      update("profitMargin", Number(e.target.value))
                    }
                    className={inputClassName}
                  />
                ) : (
                  <Value>{product.profitMargin}%</Value>
                )}
              </Field>
            </div>

            <Field label="تێبینی">
              {editing ? (
                <textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  rows={4}
                  className={inputClassName}
                />
              ) : (
                <Value>{product.notes || "—"}</Value>
              )}
            </Field>

            {editing && (
              <label className="inline-flex items-center gap-3 font-bold text-foreground">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => update("active", e.target.checked)}
                  className="size-5 rounded border-border"
                />
                بەرهەم چالاک بێت
              </label>
            )}
          </div>
        )}

        {tab === "inventory" && (
          <div className="space-y-6">
            <SectionTitle>کۆگا</SectionTitle>

            <div className="flex flex-wrap items-center gap-3">
              <StockStatusBadge status={stock.status} size="lg" />
              <p className="text-sm text-muted-foreground">
                دۆخ خۆکارە — ناکرێت دەستکاری بکرێت
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InvMetric
                label="بڕی ئێستا"
                value={formatStockQty(stock.currentStock, unitLabel)}
              />
              <InvMetric
                label="ئاگاداری کۆگا"
                value={formatStockQty(stock.minimumStock, unitLabel)}
              />
            </div>

            {editing && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="بڕی ئێستا">
                  <input
                    type="number"
                    value={form.currentStock}
                    onChange={(e) =>
                      update("currentStock", Number(e.target.value))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label="ئاگاداری کۆگا">
                  <input
                    type="number"
                    value={form.minimumStock}
                    onChange={(e) =>
                      update("minimumStock", Number(e.target.value))
                    }
                    className={inputClassName}
                  />
                </Field>
              </div>
            )}

            <div className="flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold text-primary">
              <Warehouse size={18} aria-hidden />
              کۆگا: {product.warehouseName}
            </div>

            {warehouseBalances.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-foreground">کۆگاکانی تر</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {warehouseBalances.map((w) => (
                    <div
                      key={w.warehouseId}
                      className="rounded-2xl border border-border bg-muted/40 p-4"
                    >
                      <p className="font-bold text-foreground">
                        {w.warehouseName}
                        {w.isMain ? (
                          <span className="rek-badge rek-badge-primary mr-2">
                            سەرەکی
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-2 text-lg font-black tabular-nums">
                        {formatStockQty(w.quantity, unitLabel)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "pricing" && (
          <div className="space-y-6">
            <SectionTitle>نرخ</SectionTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="نرخی کڕین">
                {editing ? (
                  <input
                    type="number"
                    value={form.purchasePrice}
                    onChange={(e) =>
                      update("purchasePrice", Number(e.target.value))
                    }
                    className={inputClassName}
                  />
                ) : (
                  <Value>{formatMoney(product.purchasePrice)} IQD</Value>
                )}
              </Field>
              <Field label="نرخی فرۆشتن">
                {editing ? (
                  <input
                    type="number"
                    value={form.salePrice}
                    onChange={(e) =>
                      update("salePrice", Number(e.target.value))
                    }
                    className={inputClassName}
                  />
                ) : (
                  <Value>{formatMoney(product.salePrice)} IQD</Value>
                )}
              </Field>
            </div>
          </div>
        )}

        {tab === "history" && (
          <ProductStockHistoryLazy productId={product.id} />
        )}

        {tab === "versions" && (
          <VersionHistoryPanel
            entityType="Product"
            entityId={product.id}
            recordLabel={product.name}
          />
        )}

        {tab === "barcode" && (
          <div className="space-y-6">
            <SectionTitle>بارکۆدی Code128</SectionTitle>
            <div className="flex flex-col items-center gap-6 rounded-[1.75rem] border border-dashed border-primary/30 bg-secondary/40 px-6 py-10">
              {form.barcode ? (
                <>
                  <BarcodeSvg
                    value={form.barcode}
                    height={72}
                    displayValue
                    className="max-w-full"
                  />
                  <p className="font-mono text-lg font-bold tracking-wider text-foreground">
                    {form.barcode}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  بارکۆد بۆ ئەم بەرهەمە نییە.
                </p>
              )}

              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  type="button"
                  disabled={barcodeBusy}
                  onClick={() => void generateBarcode(false)}
                >
                  {form.barcode ? "نوێکردنەوەی پیشاندان" : "دروستکردنی بارکۆد"}
                </Button>
                {form.barcode && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={barcodeBusy}
                    onClick={() => void generateBarcode(true)}
                  >
                    دوبارە دروستکردن
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "images" && (
          <div className="space-y-6">
            <SectionTitle>وێنەی بەرهەم</SectionTitle>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="relative aspect-square overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-secondary to-muted">
                {form.image ? (
                  <Image
                    src={form.image}
                    alt={form.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-primary/30">
                    <ImageIcon size={64} />
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center gap-4">
                <p className="text-muted-foreground">
                  وێنەی سەرەکی بەرهەم. لە کاتی دەستکاریدا دەتوانیت وێنەی نوێ
                  باربکەیت.
                </p>
                {editing ? (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-primary/40 bg-secondary/50 px-6 py-12 transition hover:bg-secondary">
                    <ImageIcon className="text-primary" size={36} />
                    <span className="mt-3 font-bold text-primary">
                      {uploading ? "بارکردن..." : "هەڵبژاردنی وێنە"}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      PNG · JPG · WEBP
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadImage(file);
                      }}
                    />
                  </label>
                ) : (
                  <Button
                    type="button"
                    className="w-fit"
                    onClick={() => {
                      setEditing(true);
                      setTab("images");
                    }}
                  >
                    <Pencil size={16} />
                    دەستکاری وێنە
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="سڕینەوەی بەرهەم"
        description={`دڵنیایت لە سڕینەوەی «${product.name}»؟ Soft delete — Undo بۆ چەند چرکەیەک · مێژووی جوڵە دەمێنێتەوە.`}
        confirmText={deleting ? "سڕینەوە..." : "سڕینەوە"}
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-black text-primary sm:text-2xl">{children}</h2>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 font-semibold text-foreground">
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-secondary/70 px-3 py-3">
      <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
        {icon ? <Warehouse size={12} /> : null}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-primary">{value}</p>
    </div>
  );
}

function InvMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rek-stat-card !p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-black text-foreground">{value}</p>
    </div>
  );
}
