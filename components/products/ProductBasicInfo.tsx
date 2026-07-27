"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { ProductFormValues } from "@/lib/validators/product";
import { useT } from "@/components/i18n/LocaleProvider";

type Unit = {
  id: string;
  name: string;
  symbol: string;
  active?: boolean;
};

export default function ProductBasicInfo() {
  const { t } = useT();
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductFormValues>();

  const [units, setUnits] = useState<Unit[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const unitRes = await fetch(
          "/api/units?activeOnly=true&pageSize=50&page=1"
        );
        const unitData = await unitRes.json();
        setUnits(unitData.data || []);
      } catch (error) {
        console.error(error);
      }
    }

    void loadData();
  }, []);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="mb-6 text-2xl font-bold text-[#FFAE42]">
        {t("products.basicInfo")}
      </h2>

      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <label className="mb-2 block font-semibold">
            {t("products.nameLabel")}
          </label>

          <input
            {...register("name")}
            type="text"
            placeholder={t("products.nameLabel")}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:border-[#FFAE42]"
          />

          {errors.name && (
            <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-semibold">SKU</label>

          <input
            {...register("sku")}
            type="text"
            placeholder="SKU"
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:border-[#FFAE42]"
          />

          {errors.sku && (
            <p className="mt-2 text-sm text-red-600">{errors.sku.message}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-semibold">
            {t("products.barcodeCode128")}
          </label>

          <input
            {...register("barcode")}
            type="text"
            placeholder={t("products.barcodePlaceholder")}
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:border-[#FFAE42]"
          />
          {errors.barcode && (
            <p className="mt-2 text-sm text-red-600">{errors.barcode.message}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-semibold">{t("nav.units")}</label>

          <select
            {...register("unitId")}
            className="w-full rounded-2xl border border-slate-300 bg-white p-3 outline-none focus:border-[#FFAE42]"
          >
            <option value="">{t("products.selectUnit")}</option>

            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.symbol})
              </option>
            ))}
          </select>

          {errors.unitId && (
            <p className="mt-2 text-sm text-red-600">{errors.unitId.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
