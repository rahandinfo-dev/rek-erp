import { formatDate, formatTime } from "@/lib/utils/datetime";
import Link from "next/link";
import { FileText, Printer, Settings } from "lucide-react";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function PrintCenterPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const recent = await db.invoice.findMany({
    where: { companyId: user.companyId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      invoiceNo: true,
      customerName: true,
      invoiceDate: true,
      invoiceTime: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black text-[#FFAE42]">سەنتەری چاپ</h1>
        <p className="mt-2 text-slate-500">
          پێشبینین، چاپ و PDF بۆ پسوولەکان — لەگەڵ لۆگۆ و قاڵبی کۆمپانیا.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard/invoices"
          className="rek-card block p-6 font-bold text-[#FFAE42]"
        >
          <FileText className="mb-3" size={22} />
          پسوولەکان →
        </Link>
        <Link
          href="/dashboard/settings/templates"
          className="rek-card block p-6 font-bold text-[#FFAE42]"
        >
          <Settings className="mb-3" size={22} />
          قاڵبی پسوولە →
        </Link>
        <Link
          href="/dashboard/sales/new"
          className="rek-card block p-6 font-bold text-[#FFAE42]"
        >
          <Printer className="mb-3" size={22} />
          فرۆشتنی نوێ →
        </Link>
      </div>

      <section className="rek-card p-5">
        <h2 className="mb-4 text-xl font-bold">دوایین پسوولەکان</h2>
        {recent.length === 0 ? (
          <p className="text-slate-500">هێشتا پسوولە نییە.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/dashboard/invoices/${inv.id}`}
                  className="flex items-center justify-between gap-3 py-3 transition hover:bg-[#FFF8EF]/50"
                >
                  <div>
                    <p className="font-bold text-[#1f1218]">{inv.invoiceNo}</p>
                    <p className="text-sm text-slate-500">{inv.customerName}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDate(inv.invoiceDate)} · {formatTime(inv.invoiceTime)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
