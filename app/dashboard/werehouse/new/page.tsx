import WarehouseForm from "@/components/werehouse/WerehouseForm";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NewWarehousePage() {
  return (
    <div className="space-y-8">

     <div className="space-y-4">

  <Link
    href="/dashboard/werehouse"
    className="
      inline-flex
      items-center
      gap-2
      rounded-xl
      border
      border-slate-200
      px-4
      py-2
      text-slate-600
      transition
      hover:bg-slate-100
    "
  >
    <ArrowRight size={18} />

    گەڕانەوە بۆ کۆگاکان
  </Link>

  <div>

    <h1 className="text-4xl font-black text-[#FFAE42]">
      زیادکردنی کۆگای نوێ
    </h1>

    <p className="mt-2 text-slate-500">
      زانیاریی کۆگا بنووسە.
    </p>

  </div>

</div>

      <WarehouseForm />

    </div>
  );
}