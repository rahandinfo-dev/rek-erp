"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { ProductFormValues } from "@/lib/validators/product";

type Unit = {
  id: string;
  name: string;
  symbol: string;
  active?: boolean;
};

export default function ProductBasicInfo() {
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
        زانیارییە سەرەکییەکان
      </h2>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Name */}

        <div>
          <label className="mb-2 block font-semibold">
            ناوی بەرهەم
          </label>

          <input
            {...register("name")}
            type="text"
            placeholder="ناوی بەرهەم"
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:border-[#FFAE42]"
          />

          {errors.name && (
            <p className="mt-2 text-sm text-red-600">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* SKU */}

        <div>
          <label className="mb-2 block font-semibold">
            SKU
          </label>

          <input
            {...register("sku")}
            type="text"
            placeholder="SKU"
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:border-[#FFAE42]"
          />

          {errors.sku && (
            <p className="mt-2 text-sm text-red-600">
              {errors.sku.message}
            </p>
          )}
        </div>

        {/* Barcode */}

        <div>
          <label className="mb-2 block font-semibold">
            بارکۆد (Code128)
          </label>

          <input
            {...register("barcode")}
            type="text"
            placeholder="خۆکار دروست دەبێت ئەگەر بەتاڵ بێت"
            className="w-full rounded-2xl border border-slate-300 p-3 outline-none focus:border-[#FFAE42]"
          />
          {errors.barcode && (
            <p className="mt-2 text-sm text-red-600">
              {errors.barcode.message}
            </p>
          )}
        </div>

        {/* Unit */}

        <div>
          <label className="mb-2 block font-semibold">
            یەکە
          </label>

          <select
            {...register("unitId")}
            className="w-full rounded-2xl border border-slate-300 bg-white p-3 outline-none focus:border-[#FFAE42]"
          >
            <option value="">
              یەکە هەڵبژێرە
            </option>

            {units.map((unit) => (
              <option
                key={unit.id}
                value={unit.id}
              >
                {unit.name} ({unit.symbol})
              </option>
            ))}
          </select>

          {errors.unitId && (
            <p className="mt-2 text-sm text-red-600">
              {errors.unitId.message}
            </p>
          )}
        </div>
        </div>
    </div>
  );
}
