import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import SupplierForm from "@/components/suppliers/SupplierForm";
import { tServer } from "@/lib/i18n";

export default function NewSupplierPage() {
  const t = tServer.t.bind(tServer);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-[#FFAE42]">
            {t("suppliers.newTitle")}
          </h1>

          <p className="mt-2 text-slate-500">
            {t("suppliers.newDescription")}
          </p>
        </div>

        <Link
          href="/dashboard/suppliers"
          className="flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-100"
        >
          <ArrowLeft size={18} />
          {t("common.back")}
        </Link>
      </div>

      <SupplierForm />
    </div>
  );
}
