import { FileText } from "lucide-react";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import InvoicesTable from "@/components/invoices/InvoicesTable";
import { tServer } from "@/lib/i18n";

export default async function InvoicesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const t = tServer.t.bind(tServer);

  const invoices = await db.invoice.findMany({
    where: { companyId: user.companyId, deletedAt: null },
    orderBy: [{ invoiceDate: "desc" }, { invoiceTime: "desc" }],
    take: 250,
    select: {
      id: true,
      invoiceNo: true,
      customerName: true,
      warehouseName: true,
      grandTotal: true,
      paymentMethod: true,
      status: true,
      invoiceDate: true,
      invoiceTime: true,
      createdByName: true,
      _count: {
        select: {
          printHistory: true,
          pdfHistory: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-[#FFF8EF] px-3 py-1 text-sm font-bold text-[#FFAE42]">
          <FileText size={16} />
          {t("invoices.moduleBadge")}
        </div>
        <h1 className="text-4xl font-black text-[#FFAE42]">{t("invoices.title")}</h1>
        <p className="mt-2 text-slate-500">{t("invoices.description")}</p>
      </div>

      <InvoicesTable
        initialData={invoices.map((inv) => ({
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          customerName: inv.customerName,
          warehouseName: inv.warehouseName,
          grandTotal: Number(inv.grandTotal),
          paymentMethod: inv.paymentMethod,
          status: inv.status,
          invoiceDate: inv.invoiceDate,
          invoiceTime: inv.invoiceTime,
          createdByName: inv.createdByName,
          printCount: inv._count.printHistory,
          pdfCount: inv._count.pdfHistory,
        }))}
      />
    </div>
  );
}
