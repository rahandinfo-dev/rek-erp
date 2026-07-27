import Link from "next/link";
import EditUnitForm from "@/components/units/EditUnitForm";
import { tServer } from "@/lib/i18n";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditUnitPage({ params }: Props) {
  const t = tServer.t;
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#FFAE42]">
          {t("units.editTitle")}
        </h1>

        <Link
          href="/dashboard/units"
          className="rounded-2xl border border-[#FFAE42] px-6 py-3 font-bold text-[#FFAE42] transition hover:bg-[#FFAE42] hover:text-white"
        >
          ← {t("common.back")}
        </Link>
      </div>

      <EditUnitForm id={id} />
    </div>
  );
}
