import Link from "next/link";
import { ArrowRight } from "lucide-react";
import EmployeeForm from "@/components/employees/EmployeeForm";

export default function NewEmployeePage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl">
            کارمەندی نوێ
          </h1>
          <p className="mt-2 text-slate-500">
            زانیاری کارمەند تۆمار بکە و پاشەکەوتی بکە.
          </p>
        </div>
        <Link
          href="/dashboard/employees"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold transition hover:bg-slate-100"
        >
          <ArrowRight size={18} />
          گەڕانەوە
        </Link>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <EmployeeForm />
      </div>
    </div>
  );
}
