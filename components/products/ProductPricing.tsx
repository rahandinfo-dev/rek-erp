"use client";

import { useFormContext } from "react-hook-form";
import { ProductFormValues } from "@/lib/validators/product";

export default function ProductPricing() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductFormValues>();

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">

      <h2 className="mb-6 text-2xl font-bold text-[#FFAE42]">
        نرخەکان
      </h2>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-2 block font-semibold">نرخی کڕین</label>
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
          <label className="mb-2 block font-semibold">تێچوون</label>
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
          <label className="mb-2 block font-semibold">نرخی فرۆشتن</label>
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
          <label className="mb-2 block font-semibold">ڕێژەی قازانج (%)</label>
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