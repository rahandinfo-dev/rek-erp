import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import SaleForm from "@/components/sales/SaleForm";
import { tServer } from "@/lib/i18n";

export default function NewSalePage() {
  const t = tServer.t.bind(tServer);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/sales"
          className="rounded-xl border p-2 text-slate-600 hover:bg-slate-50"
        >
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl">
            {t("sales.new")}
          </h1>
          <p className="mt-2 text-slate-500">{t("sales.newDescription")}</p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {t("common.wait")}
          </div>
        }
      >
        <SaleForm />
      </Suspense>
    </div>
  );
}
