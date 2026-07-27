import WarehouseForm from "@/components/werehouse/WerehouseForm";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { tServer } from "@/lib/i18n";

export default function NewWarehousePage() {
  const t = tServer.t;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href="/dashboard/werehouse"
          className="
      inline-flex
      items-center
      gap-2
      rounded-xl
      border
      border-slate-200
      px-4
      py-2
      text-slate-600
      transition
      hover:bg-slate-100
    "
        >
          <ArrowRight size={18} />
          {t("warehouses.backToList")}
        </Link>

        <div>
          <h1 className="text-4xl font-black text-[#FFAE42]">
            {t("warehouses.newTitle")}
          </h1>

          <p className="mt-2 text-slate-500">{t("warehouses.newDescription")}</p>
        </div>
      </div>

      <WarehouseForm />
    </div>
  );
}
