import Link from "next/link";
import UnitForm from "@/components/units/UnitForm";

export default function NewUnitPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#FFAE42]">
          زیادکردنی یەکە
        </h1>

        <Link
          href="/dashboard/units"
          className="rounded-2xl border border-[#FFAE42] px-6 py-3 font-bold text-[#FFAE42] transition hover:bg-[#FFAE42] hover:text-white"
        >
          ← گەڕاندنەوە
        </Link>
      </div>

      <UnitForm />
    </div>
  );
}