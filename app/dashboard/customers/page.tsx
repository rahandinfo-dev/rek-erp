import Link from "next/link";
import { Plus } from "lucide-react";
import CustomersBrowser from "@/components/customers/CustomersBrowser";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { loadCustomerPartyStats } from "@/lib/parties/stats";
import { PageHeader } from "@/components/ui/PageHeader";
import { redirect } from "next/navigation";

export default async function CustomersPage() {
  const companyId = await getCurrentCompanyId();
  if (!companyId) redirect("/login");

  const customers = await loadCustomerPartyStats(companyId);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="کڕیاران"
        description="ناو، مۆبایل، کۆی کڕین، قەرز و دوایین کڕین."
        breadcrumb={[
          { label: "داشبۆرد", href: "/dashboard" },
          { label: "کڕیاران" },
        ]}
        actions={
          <Link
            href="/dashboard/customers/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-bold text-primary-foreground transition hover:bg-[var(--brand-hover)]"
          >
            <Plus size={20} aria-hidden />
            کڕیاری نوێ
          </Link>
        }
      />

      <CustomersBrowser initialData={customers} />
    </div>
  );
}
