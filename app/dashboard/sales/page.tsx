import Link from "next/link";
import { Plus } from "lucide-react";
import SalesTable from "@/components/sales/SalesTable";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { redirect } from "next/navigation";

export default async function SalesPage() {
  const companyId = await getCurrentCompanyId();
  if (!companyId) redirect("/login");

  const sales = await db.sale.findMany({
    where: { companyId },
    select: {
      id: true,
      invoiceNo: true,
      saleDate: true,
      status: true,
      total: true,
      customer: { select: { name: true } },
      warehouse: { select: { name: true } },
      invoice: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  const initialData = sales.map((s) => ({
    id: s.id,
    invoiceNo: s.invoiceNo,
    saleDate: s.saleDate.toISOString(),
    status: s.status,
    total: Number(s.total),
    customer: s.customer,
    warehouse: s.warehouse,
    invoiceId: s.invoice?.id ?? null,
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="فرۆشتن"
        description="هەر فرۆشتنێکی تەواو خۆکار پسوولە دروست دەکات."
        breadcrumb={[
          { label: "داشبۆرد", href: "/dashboard" },
          { label: "فرۆشتن" },
        ]}
        actions={
          <Link
            href="/dashboard/sales/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-bold text-primary-foreground transition hover:bg-[var(--brand-hover)] active:scale-[0.98]"
          >
            <Plus size={20} aria-hidden />
            فرۆشتنی نوێ
          </Link>
        }
      />

      <div className="rek-card p-4 sm:p-8">
        <SalesTable initialData={initialData} />
      </div>
    </div>
  );
}
