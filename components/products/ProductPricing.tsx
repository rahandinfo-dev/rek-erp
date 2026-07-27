"use client";

import { useFormContext } from "react-hook-form";
import { ProductFormValues } from "@/lib/validators/product";
import { useT } from "@/components/i18n/LocaleProvider";

export default function ProductPricing() {
  const { t } = useT();
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductFormValues>();

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="mb-6 text-2xl font-bold text-[#FFAE42]">
        {t("products.prices")}
      </h2>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-2 block font-semibold">
            {t("products.purchasePrice")}
          </label>
          <input
            type="number"
            step="0.01"
            {...register("purchasePrice", { valueAsNumber: true })}
            className="w-full rounded-2xl border border-border p-3"
          />
          {errors.purchasePrice && (
            <p className="mt-2 text-sm text-red-600">
              {errors.purchasePrice.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-semibold">{t("products.cost")}</label>
          <input
            type="number"
            step="0.01"
            {...register("costPrice", { valueAsNumber: true })}
            className="w-full rounded-2xl border border-border p-3"
          />
          {errors.costPrice && (
            <p className="mt-2 text-sm text-red-600">
              {errors.costPrice.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-semibold">
            {t("products.salePrice")}
          </label>
          <input
            type="number"
            step="0.01"
            {...register("salePrice", { valueAsNumber: true })}
            className="w-full rounded-2xl border border-border p-3"
          />
          {errors.salePrice && (
            <p className="mt-2 text-sm text-red-600">
              {errors.salePrice.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-semibold">
            {t("products.profitMargin")}
          </label>
          <input
            type="number"
            step="0.01"
            {...register("profitMargin", { valueAsNumber: true })}
            className="w-full rounded-2xl border border-border p-3"
          />
          {errors.profitMargin && (
            <p className="mt-2 text-sm text-red-600">
              {errors.profitMargin.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
