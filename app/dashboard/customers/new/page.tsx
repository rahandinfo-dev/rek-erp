import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CustomerForm from "@/components/customers/CustomerForm";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/customers"
          className="rounded-xl border p-2 text-slate-600 hover:bg-slate-50"
        >
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl">
            کڕیاری نوێ
          </h1>
          <p className="mt-2 text-slate-500">زانیاری کڕیاری نوێ زیاد بکە.</p>
        </div>
      </div>

      <CustomerForm />
    </div>
  );
}
