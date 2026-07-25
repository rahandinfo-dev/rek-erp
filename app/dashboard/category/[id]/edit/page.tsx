import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import CategoryForm from "@/components/category/CategoryForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCategoryPage({
  params,
}: Props) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { id } = await params;

  const category = await db.category.findFirst({
    where: {
      id,
      companyId: user.companyId,
    },
  });

  if (!category) {
    notFound();
  }

  return (
    <div className="space-y-8">

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-4xl font-black text-[#FFAE42]">
            دەستکاریکردنی پۆل
          </h1>

          <p className="mt-2 text-slate-500">
            زانیاریی پۆلەکە نوێ بکەرەوە.
          </p>
        </div>

        <Link
          href="/dashboard/category"
          className="flex items-center gap-2 rounded-xl border px-5 py-3 hover:bg-slate-100"
        >
          <ArrowLeft size={18} />
          گەڕانەوە
        </Link>

      </div>

      <CategoryForm
        category={category}
      />

    </div>
  );
}