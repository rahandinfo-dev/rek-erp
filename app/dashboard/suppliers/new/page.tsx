import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import SupplierForm from "@/components/suppliers/SupplierForm";

export default function NewSupplierPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-[#FFAE42]">
            زیادکردنی دابینکەری نوێ
          </h1>

          <p className="mt-2 text-slate-500">
            دابینکەرێکی نوێ زیاد بکە بۆ کۆمپانیاکەت.
          </p>
        </div>

        <Link
          href="/dashboard/suppliers"
          className="flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-100"
        >
          <ArrowLeft size={18} />
          گەڕانەوە
        </Link>
      </div>

      <SupplierForm />
    </div>
  );
}