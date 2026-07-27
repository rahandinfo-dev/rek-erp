"use client";

import { useFormContext } from "react-hook-form";
import { ProductFormValues } from "@/lib/validators/product";
import { useT } from "@/components/i18n/LocaleProvider";

export default function ProductNotes() {
  const { t } = useT();
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductFormValues>();

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="mb-6 text-2xl font-bold text-[#FFAE42]">
        {t("common.notes")}
      </h2>

      <textarea
        {...register("notes")}
        rows={5}
        placeholder={t("products.notesPlaceholder")}
        className="w-full rounded-2xl border border-slate-300 p-4 outline-none focus:border-[#FFAE42]"
      />

      {errors.notes && (
        <p className="mt-2 text-sm text-red-600">{errors.notes.message}</p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <input
          id="product-active"
          type="checkbox"
          {...register("active")}
          className="size-4 rounded border-slate-300"
        />
        <label htmlFor="product-active" className="font-semibold">
          {t("products.productActive")}
        </label>
      </div>
    </div>
  );
}
