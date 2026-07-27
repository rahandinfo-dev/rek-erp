import Link from "next/link";
import UnitForm from "@/components/units/UnitForm";
import { tServer } from "@/lib/i18n";

export default function NewUnitPage() {
  const t = tServer.t;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#FFAE42]">{t("units.newTitle")}</h1>

        <Link
          href="/dashboard/units"
          className="rounded-2xl border border-[#FFAE42] px-6 py-3 font-bold text-[#FFAE42] transition hover:bg-[#FFAE42] hover:text-white"
        >
          ← {t("common.back")}
        </Link>
      </div>

      <UnitForm />
    </div>
  );
}
