import BrandForm from "@/components/brands/BrandForm";
import { tServer } from "@/lib/i18n";

export default function NewBrandPage() {
  const t = tServer.t;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#FFAE42]">{t("brands.newTitle")}</h1>

      <BrandForm />
    </div>
  );
}
