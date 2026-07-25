import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import EditSupplierForm from "@/components/suppliers/EditSupplierForm";
import RecordVersionHistorySection from "@/components/versions/RecordVersionHistorySection";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSupplierPage({
  params,
}: Props) {
  const { id } = await params;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-[#FFAE42]">
            دەستکاریکردنی دابینکەر
          </h1>

          <p className="mt-2 text-slate-500">
            زانیاری دابینکەر نوێ بکەرەوە.
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

      <EditSupplierForm id={id} />

      <RecordVersionHistorySection entityType="Supplier" entityId={id} />
    </div>
  );
}