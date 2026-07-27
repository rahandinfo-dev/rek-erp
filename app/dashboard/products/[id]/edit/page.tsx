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
    <div className="min-h-[100dvh] space-y-8 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl">
            دەستکاریکردنی بەرهەم
          </h1>

          <p className="mt-2 text-slate-500">
            زانیارییەکانی بەرهەم نوێ بکەرەوە. بۆ گۆڕینی وێنە، بڕین و
            گەورەکردن بەردەستە.
          </p>
        </div>

        <Link
          href={`/dashboard/products/${id}`}
          className="inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-5 py-3 font-bold transition hover:bg-slate-100"
        >
          <ArrowRight size={18} />
          گەڕانەوە
        </Link>
      </div>

      <div className="min-h-[70dvh] border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
        <h2 className="mb-6 text-xl font-bold text-[#FFAE42] sm:mb-8 sm:text-2xl">
          دەستکاریکردنی زانیارییەکان
        </h2>

        <EditProductForm id={id} />
      </div>
    </div>
  );
}