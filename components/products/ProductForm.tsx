"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  calcProfitAmount,
  calcProfitMargin,
  productCreateSchema,
  type ProductCreateInput,
  type ProductCreateValues,
} from "@/lib/validators/product";
import { appToast } from "@/lib/toast";
import { useFormDraft } from "@/lib/hooks/useFormDraft";
import { DRAFT_KEYS } from "@/lib/drafts/types";
import { AutoSaveBar, AutoSaveStatus } from "@/components/ui/AutoSaveStatus";
import { formatMoney } from "@/lib/utils/format";
import { useNavigationHistory } from "@/lib/history/provider";
import ProductImage from "./ProductImage";

type Unit = { id: string; name: string; symbol: string };
type Warehouse = { id: string; name: string; isMain?: boolean };

type Props = {
  initialBarcode?: string;
  initialUnits: Unit[];
  initialWarehouses: Warehouse[];
};

function isProductDraftEmpty(v: ProductCreateInput) {
  return (
    !String(v.name || "").trim() &&
    !String(v.unitId || "").trim() &&
    !String(v.warehouseId || "").trim() &&
    !String(v.notes || "").trim() &&
    !String(v.image || "").trim()
  );
}

export default function ProductForm({
  initialBarcode = "",
  initialUnits,
  initialWarehouses,
}: Props) {
  const router = useRouter();
  const { markCreated } = useNavigationHistory();
  const [loading, setLoading] = useState(false);
  const [units] = useState(initialUnits);
  const [warehouses] = useState(initialWarehouses);

  const defaultWarehouseId =
    warehouses.find((w) => w.isMain)?.id || warehouses[0]?.id || "";

  const form = useForm<ProductCreateInput, unknown, ProductCreateValues>({
    resolver: zodResolver(productCreateSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: initialBarcode,
      unitId: units[0]?.id || "",
      warehouseId: defaultWarehouseId,
      purchasePrice: 0,
      costPrice: 0,
      salePrice: 0,
      profitMargin: 0,
      currentStock: 0,
      reservedStock: 0,
      minimumStock: 0,
      maximumStock: 0,
      notes: "",
      active: true,
      image: "",
    },
  });

  const watched = useWatch({ control: form.control });
  const purchase = Number(watched?.purchasePrice ?? 0);
  const sale = Number(watched?.salePrice ?? 0);

  const profitAmount = useMemo(
    () => calcProfitAmount(purchase, sale),
    [purchase, sale]
  );
  const profitPct = useMemo(
    () => calcProfitMargin(purchase, sale),
    [purchase, sale]
  );

  const setFormValue = form.setValue;
  useEffect(() => {
    setFormValue("profitMargin", profitPct, { shouldDirty: false });
    setFormValue("costPrice", purchase, { shouldDirty: false });
  }, [setFormValue, profitPct, purchase]);

  const {
    status: draftStatus,
    savedAt: draftSavedAt,
    hasPendingDraft,
    pendingDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useFormDraft({
    key: DRAFT_KEYS.productNew,
    value: (watched ?? form.getValues()) as ProductCreateInput,
    isEmpty: isProductDraftEmpty,
  });

  if (warehouses.length === 0) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
        <p className="text-lg font-black text-amber-950">
          Please create a warehouse before creating products.
        </p>
        <p className="mt-2 text-sm text-amber-900/80">
          پێویستە سەرەتا کۆگایەک دروست بکەیت پێش زیادکردنی بەرهەم.
        </p>
        <Link
          href="/dashboard/werehouse/new"
          className="mt-6 inline-flex h-11 items-center rounded-2xl bg-primary px-6 font-bold text-primary-foreground"
        >
          دروستکردنی کۆگا
        </Link>
      </div>
    );
  }

  const onSubmit = async (values: ProductCreateValues) => {
    try {
      setLoading(true);
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          sku: "",
          barcode: values.barcode?.trim() || initialBarcode || undefined,
          costPrice: Number(values.purchasePrice) || 0,
          profitMargin: calcProfitMargin(
            Number(values.purchasePrice) || 0,
            Number(values.salePrice) || 0
          ),
          reservedStock: 0,
          maximumStock: 0,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        appToast.error(data.message || "هەڵەیەک ڕوویدا.");
        return;
      }
      appToast.productSaved(
        `بەرهەم تۆمارکرا · SKU: ${data.data?.sku || "—"}`
      );
      clearDraft();
      form.reset();
      const id = data.data?.id as string | undefined;
      const name = (data.data?.name as string | undefined) || "New Product";
      if (id) {
        markCreated(`/dashboard/products/${id}`, name, "products");
      }
      router.push(id ? `/dashboard/products/${id}` : "/dashboard/products");
      router.refresh();
    } catch (error) {
      console.error(error);
      appToast.error("هەڵەیەک ڕوویدا.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/35";

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <AutoSaveBar
          status={draftStatus}
          savedAt={draftSavedAt}
          hasPendingDraft={hasPendingDraft}
          pendingSavedAt={pendingDraft?.savedAt}
          onRestore={() => {
            const data = restoreDraft();
            if (data) form.reset(data);
          }}
          onDiscard={discardDraft}
        />

        <section className="rek-card space-y-4 p-4 sm:p-6">
          <h2 className="text-lg font-black text-foreground">زانیاری گشتی</h2>
          <div>
            <label className="mb-1.5 block text-sm font-bold">ناوی بەرهەم</label>
            <input
              {...form.register("name")}
              autoFocus
              placeholder="ناوی بەرهەم بنووسە"
              className={inputClass}
            />
            {form.formState.errors.name ? (
              <p className="mt-1 text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
            <p className="mt-1.5 text-xs text-muted-foreground">
              SKU و بارکۆد دوای پاشەکەوتکردن خۆکار دروست دەبن.
            </p>
          </div>
        </section>

        <section className="rek-card space-y-4 p-4 sm:p-6">
          <h2 className="text-lg font-black text-foreground">یەکە</h2>
          <select {...form.register("unitId")} className={inputClass}>
            <option value="">یەکە هەڵبژێرە</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
          {form.formState.errors.unitId ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.unitId.message}
            </p>
          ) : null}
        </section>

        <section className="rek-card space-y-4 p-4 sm:p-6">
          <h2 className="text-lg font-black text-foreground">نرخ</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-bold">
                تێچووی کڕین
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                {...form.register("purchasePrice", { valueAsNumber: true })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold">
                نرخی فرۆشتن
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                {...form.register("salePrice", { valueAsNumber: true })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold">قازانج</label>
              <div className="flex h-11 items-center rounded-2xl border border-border bg-muted/50 px-3 text-sm font-bold">
                {formatMoney(profitAmount)} IQD
                <span className="ms-2 text-xs font-semibold text-muted-foreground">
                  ({profitPct}%)
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rek-card space-y-4 p-4 sm:p-6">
          <h2 className="text-lg font-black text-foreground">کۆگا</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="mb-1.5 block text-sm font-bold">کۆگا</label>
              <select {...form.register("warehouseId")} className={inputClass}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.isMain ? " (سەرەکی)" : ""}
                  </option>
                ))}
              </select>
              {form.formState.errors.warehouseId ? (
                <p className="mt-1 text-sm text-destructive">
                  {form.formState.errors.warehouseId.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold">بڕی ئێستا</label>
              <input
                type="number"
                min={0}
                step="0.01"
                {...form.register("currentStock", { valueAsNumber: true })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold">
                ئاگاداری کۆگا
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                {...form.register("minimumStock", { valueAsNumber: true })}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                کاتێک بڕ کەمتر لەم ژمارەیە بێت، ئاگاداری دەردەچێت.
              </p>
            </div>
          </div>
        </section>

        <ProductImage />

        <section className="rek-card space-y-4 p-4 sm:p-6">
          <h2 className="text-lg font-black text-foreground">تێبینی</h2>
          <textarea
            {...form.register("notes")}
            rows={3}
            placeholder="ئارەزوومەندانە"
            className="w-full rounded-2xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary/50"
          />
        </section>

        <section className="rek-card flex items-center justify-between gap-4 p-4 sm:p-6">
          <div>
            <p className="font-bold text-foreground">دۆخ</p>
            <p className="text-xs text-muted-foreground">چالاک / ناچالاک</p>
          </div>
          <Controller
            name="active"
            control={form.control}
            render={({ field }) => (
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className={`relative h-8 w-14 rounded-full transition ${
                  field.value ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-1 size-6 rounded-full bg-white shadow transition ${
                    field.value ? "right-1" : "left-1"
                  }`}
                />
              </button>
            )}
          />
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <AutoSaveStatus status={draftStatus} savedAt={draftSavedAt} />
          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-2xl bg-primary px-8 text-base font-bold text-primary-foreground shadow-[0_6px_16px_var(--shadow-brand)] transition hover:bg-[var(--brand-hover)] disabled:opacity-50"
          >
            {loading ? "پاشەکەوت..." : "پاشەکەوتکردنی بەرهەم"}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
