import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import DeleteTemplateButton from "@/components/invoices/DeleteTemplateButton";

export default async function TemplatesPage() {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const templates = await db.invoiceTemplate.findMany({
    where: { companyId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl">
            قاڵبی پسوولە
          </h1>
          <p className="mt-2 text-slate-500">
            چەند قاڵب دروست بکە — A4، Thermal، Receipt
          </p>
        </div>
        <Link
          href="/dashboard/settings/templates/new"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FFAE42] px-5 py-3 font-bold text-white"
        >
          <Plus size={18} />
          قاڵبی نوێ
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500 md:col-span-2 xl:col-span-3">
            هیچ قاڵبێک نییە. یەکەم قاڵب دروست بکە.
          </div>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-[#FFAE42]">
                    {template.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {template.size} · {template.docType}
                  </p>
                </div>
                {template.isDefault && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    سەرەکی
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Link
                  href={`/dashboard/settings/templates/${template.id}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border py-2.5 font-semibold"
                >
                  <Pencil size={16} />
                  دەستکاری
                </Link>
                <DeleteTemplateButton id={template.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
