import Link from "next/link";
import { Plus } from "lucide-react";
import SuppliersBrowser from "@/components/suppliers/SuppliersBrowser";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { loadSupplierPartyStats } from "@/lib/parties/stats";
import { PageHeader } from "@/components/ui/PageHeader";
import { redirect } from "next/navigation";
import { tServer } from "@/lib/i18n";

export default async function SuppliersPage() {
  const companyId = await getCurrentCompanyId();
  if (!companyId) redirect("/login");

  const suppliers = await loadSupplierPartyStats(companyId);
  const t = tServer.t.bind(tServer);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={t("suppliers.title")}
        description={t("suppliers.description")}
        breadcrumb={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.suppliers") },
        ]}
        actions={
          <Link
            href="/dashboard/suppliers/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-bold text-primary-foreground transition hover:bg-[var(--brand-hover)]"
          >
            <Plus size={20} aria-hidden />
            {t("suppliers.new")}
          </Link>
        }
      />

      <SuppliersBrowser initialData={suppliers} />
    </div>
  );
}
