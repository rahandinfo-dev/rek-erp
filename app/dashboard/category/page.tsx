import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import CategoryTable from "@/components/category/CategoryTable";
import { tServer } from "@/lib/i18n";

export default async function CategoryPage() {
  const t = tServer.t;
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const categories = await db.category.findMany({
    where: {
      companyId: user.companyId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-[#FFAE42]">
            {t("categories.title")}
          </h1>

          <p className="mt-2 text-slate-500">{t("categories.description")}</p>
        </div>

        <Link
          href="/dashboard/category/new"
          className="
            flex
            items-center
            gap-2
            rounded-2xl
            bg-[#FFAE42]
            px-6
            py-3
            text-white
            transition
            hover:opacity-90
          "
        >
          <Plus size={20} />
          {t("categories.add")}
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold">{t("categories.emptyTitle")}</h2>

          <p className="mt-3 text-slate-500">{t("categories.emptyBody")}</p>
        </div>
      ) : (
        <CategoryTable categories={categories} />
      )}
    </div>
  );
}
