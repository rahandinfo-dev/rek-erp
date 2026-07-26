import Link from "next/link";
import { ArrowRight } from "lucide-react";
import EditCustomerForm from "@/components/customers/EditCustomerForm";
import RecordVersionHistorySection from "@/components/versions/RecordVersionHistorySection";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditCustomerPage({ params }: Props) {
  const { id } = await params;

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
            دەستکاری کڕیار
          </h1>
          <p className="mt-2 text-slate-500">زانیاری کڕیار نوێ بکەرەوە.</p>
        </div>
      </div>

      <EditCustomerForm id={id} />

      <RecordVersionHistorySection entityType="کڕیار" entityId={id} />
    </div>
  );
}
