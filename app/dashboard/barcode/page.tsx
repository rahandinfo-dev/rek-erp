import dynamic from "next/dynamic";
import { Barcode } from "lucide-react";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { tServer } from "@/lib/i18n";

const BarcodeWorkbench = dynamic(
  () => import("@/components/barcode/BarcodeWorkbench"),
  {
    loading: () => (
      <div className="rounded-3xl bg-muted px-6 py-16 text-center text-slate-500">
        بارکردن…
      </div>
    ),
  }
);

export default async function BarcodePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const t = tServer.t;

  const products = await db.product.findMany({
    where: { companyId: user.companyId, active: true },
    orderBy: { name: "asc" },
    take: 500,
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      salePrice: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-[#FFF8EF] px-3 py-1 text-sm font-bold text-[#FFAE42]">
          <Barcode size={16} />
          {t("barcode.badge")}
        </div>
        <h1 className="text-4xl font-black text-[#FFAE42]">{t("barcode.title")}</h1>
        <p className="mt-2 text-slate-500">{t("barcode.subtitle")}</p>
      </div>

      <BarcodeWorkbench
        companyName={user.company.name}
        companyLogo={user.company.logo}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          salePrice: Number(p.salePrice),
        }))}
      />
    </div>
  );
}
