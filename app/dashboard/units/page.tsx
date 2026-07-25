import Link from "next/link";
import UnitTable from "@/components/units/UnitTable";

export default function UnitsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#FFAE42]">
          یەکەکان
        </h1>

        <Link
          href="/dashboard/units/new"
          className="rounded-2xl bg-[#FFAE42] px-6 py-3 font-bold text-white transition hover:opacity-90"
        >
          + زیادکردنی یەکە
        </Link>
      </div>

      <UnitTable />
    </div>
  );
}