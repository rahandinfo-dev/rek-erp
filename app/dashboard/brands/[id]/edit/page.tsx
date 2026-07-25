import Link from "next/link";
import EditBrandForm from "@/components/brands/EditBrandForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditBrandPage({
  params,
}: Props) {
  const { id } = await params;

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <h1 className="text-3xl font-bold text-[#FFAE42]">
          دەستکاریکردنی براند
        </h1>

        <Link
          href="/dashboard/brands"
          className="rounded-2xl border border-[#FFAE42] px-6 py-3 font-bold text-[#FFAE42] transition hover:bg-[#FFAE42] hover:text-white"
        >
          ← گەڕاندنەوە
        </Link>

      </div>

      <EditBrandForm id={id} />

    </div>
  );
}