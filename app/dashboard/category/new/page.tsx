import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CategoryForm from "@/components/category/CategoryForm";

export default function NewCategoryPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-4xl font-black text-[#FFAE42]">
            زیادکردنی پۆل
          </h1>

          <p className="mt-2 text-slate-500">
            پۆلێکی نوێ زیاد بکە بۆ بەرهەمەکان.
          </p>
        </div>

        <Link
          href="/dashboard/category"
          className="
            flex
            items-center
            gap-2
            rounded-xl
            border
            px-5
            py-3
            transition
            hover:bg-slate-100
          "
        >
          <ArrowLeft size={18} />
          گەڕانەوە
        </Link>

      </div>

      <CategoryForm />
    </div>
  );
}