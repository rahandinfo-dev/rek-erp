import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PurchaseForm from "@/components/purchases/PurchaseForm";

export default function NewPurchasePage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/purchases"
          className="rounded-xl border p-2 text-slate-600 hover:bg-slate-50"
        >
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl">
            کڕینی نوێ
          </h1>
          <p className="mt-2 text-slate-500">پسوولەی کڕین تۆمار بکە.</p>
        </div>
      </div>

      <PurchaseForm />
    </div>
  );
}
