import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CategoryForm from "@/components/category/CategoryForm";
import { tServer } from "@/lib/i18n";

export default function NewCategoryPage() {
  const t = tServer.t;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-[#FFAE42]">
            {t("categories.newTitle")}
          </h1>

          <p className="mt-2 text-slate-500">{t("categories.newDescription")}</p>
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
          {t("common.back")}
        </Link>
      </div>

      <CategoryForm />
    </div>
  );
}
