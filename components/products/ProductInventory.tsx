"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { ProductFormValues } from "@/lib/validators/product";
import { useT } from "@/components/i18n/LocaleProvider";

/** Legacy section — prefer ProductForm warehouse block on create. */
export default function ProductInventory() {
  const { t } = useT();
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductFormValues>();
  const [warehouseName, setWarehouseName] = useState(() => t("nav.warehouse"));

  useEffect(() => {
    async function loadWarehouse() {
      try {
        const res = await fetch("/api/werehouses");
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data[0]?.name) {
          const main =
            data.data.find((w: { isMain?: boolean }) => w.isMain) ||
            data.data[0];
          setWarehouseName(main.name);
        }
      } catch {
        // keep default label
      }
    }
    void loadWarehouse();
  }, []);

  return (
    <div className="rek-card p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-black text-foreground">
        {t("products.warehouse")}
      </h2>

      <div className="mb-4 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm">
        <span className="font-bold text-foreground">
          {t("products.warehouseLabel")}
        </span>
        <span className="text-muted-foreground">{warehouseName}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-bold">
            {t("products.currentStock")}
          </label>
          <input
            type="number"
            step="0.01"
            {...register("currentStock", { valueAsNumber: true })}
            className="h-11 w-full rounded-2xl border border-border px-3"
          />
          {errors.currentStock ? (
            <p className="mt-1 text-sm text-destructive">
              {errors.currentStock.message}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-bold">
            {t("products.stockAlert")}
          </label>
          <input
            type="number"
            step="0.01"
            {...register("minimumStock", { valueAsNumber: true })}
            className="h-11 w-full rounded-2xl border border-border px-3"
          />
          {errors.minimumStock ? (
            <p className="mt-1 text-sm text-destructive">
              {errors.minimumStock.message}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {t("products.stockAlertHint")}
          </p>
        </div>
      </div>

      <input
        type="hidden"
        {...register("maximumStock", { valueAsNumber: true })}
      />
      <input
        type="hidden"
        {...register("reservedStock", { valueAsNumber: true })}
      />
    </div>
  );
}
