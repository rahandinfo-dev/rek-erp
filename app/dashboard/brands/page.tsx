import Link from "next/link";
import BrandTable from "@/components/brands/BrandTable";
import { tServer } from "@/lib/i18n";

export default function BrandsPage() {
  const t = tServer.t;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#FFAE42]">{t("brands.title")}</h1>

        <Link
          href="/dashboard/brands/new"
          className="rounded-2xl bg-[#FFAE42] px-6 py-3 font-bold text-white"
        >
          {t("brands.addWithPlus")}
        </Link>
      </div>

      <BrandTable />
    </div>
  );
}
