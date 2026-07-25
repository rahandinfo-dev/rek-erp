import Link from "next/link";
import { ArrowRight } from "lucide-react";
import EditProductForm from "@/components/products/EditProductForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditProductPage({
  params,
}: Props) {
  const { id } = await params;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-[#FFAE42]">
            دەستکاریکردنی بەرهەم
          </h1>

          <p className="mt-2 text-slate-500">
            زانیارییەکانی بەرهەم نوێ بکەرەوە.
          </p>
        </div>

        <Link
          href={`/dashboard/products/${id}`}
          className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold transition hover:bg-slate-100"
        >
          <ArrowRight size={18} />
          گەڕانەوە
        </Link>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-8 text-2xl font-bold text-[#FFAE42]">
          دەستکاریکردنی زانیارییەکان
        </h2>

        <EditProductForm id={id} />
      </div>
    </div>
  );
}