"use client";
import { formatDate } from "@/lib/utils/datetime";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Eye, Search, XCircle } from "lucide-react";
import { formatMoney } from "@/lib/utils/format";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import BulkListShell from "@/components/bulk/BulkListShell";
import ContextMenuSurface from "@/components/quick-actions/ContextMenuSurface";
import { useT } from "@/components/i18n/LocaleProvider";

export type PurchaseRow = {
  id: string;
  invoiceNo: string;
  purchaseDate: string;
  status: string;
  total: string | number;
  supplier: { name: string };
  warehouse: { name: string };
};

export default function PurchasesTable({
  initialData,
}: {
  initialData: PurchaseRow[];
}) {
  const { t } = useT();
  const [purchases, setPurchases] = useState(initialData);
  const [search, setSearch] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function cancelPurchase(id: string) {
    const { softDeleteWithUndo } = await import("@/lib/delete/withUndo");
    await softDeleteWithUndo({
      deleteUrl: `/api/purchases/${id}`,
      restoreUrl: `/api/purchases/${id}/restore`,
      module: "purchases",
      title: t("purchases.cancelledTitle"),
      entityType: "Purchase",
      entityId: id,
      onSoftDeleted: () => {
        startTransition(() => {
          setPurchases((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: "CANCELLED" } : p))
          );
        });
      },
      onRestored: () => {
        startTransition(() => {
          setPurchases((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: "COMPLETED" } : p))
          );
        });
      },
    });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return purchases.filter(
      (p) =>
        p.invoiceNo.toLowerCase().includes(q) ||
        p.supplier.name.toLowerCase().includes(q)
    );
  }, [purchases, search]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={20}
        />
        <input
          type="text"
          placeholder={t("purchases.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-slate-300 py-3 pl-12 pr-4 outline-none focus:border-[#FFAE42]"
        />
      </div>

      <BulkListShell
        moduleKey="purchases"
        ids={filtered.map((p) => p.id)}
        labels={Object.fromEntries(
          filtered.map((p) => [p.id, p.invoiceNo])
        )}
      >
        {({ isSelected, toggle, headerCheckbox }) => (
      <div className="rek-table-shell">
        <div className="rek-table-wrap">
        <table className="w-full min-w-[560px] sm:min-w-[720px]">
          <thead className="bg-slate-100">
            <tr className="text-right">
              <th className="px-5 py-4">{headerCheckbox}</th>
              <th className="px-5 py-4">{t("common.invoice")}</th>
              <th className="px-5 py-4">{t("purchases.supplierOptional")}</th>
              <th className="px-5 py-4">{t("common.warehouse")}</th>
              <th className="px-5 py-4">{t("common.date")}</th>
              <th className="px-5 py-4">{t("common.total")}</th>
              <th className="px-5 py-4">{t("common.status")}</th>
              <th className="px-5 py-4 text-center">{t("common.action")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500">
                  {t("purchases.notFound")}
                </td>
              </tr>
            ) : (
              filtered.map((purchase) => (
                <ContextMenuSurface
                  key={purchase.id}
                  as="tr"
                  className="border-t hover:bg-slate-50"
                  record={{
                    id: purchase.id,
                    moduleKey: "purchases",
                    label: purchase.invoiceNo,
                    href: `/dashboard/purchases/${purchase.id}`,
                    entityType: "Purchase",
                    deleted: purchase.status === "CANCELLED",
                  }}
                >
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected(purchase.id)}
                      onChange={() => toggle(purchase.id)}
                      aria-label={t("common.selectNamed", { name: purchase.invoiceNo })}
                    />
                  </td>
                  <td className="px-5 py-4 font-medium">{purchase.invoiceNo}</td>
                  <td className="px-5 py-4">{purchase.supplier.name}</td>
                  <td className="px-5 py-4">{purchase.warehouse.name}</td>
                  <td className="px-5 py-4">
                    {formatDate(purchase.purchaseDate)}
                  </td>
                  <td className="px-5 py-4">
                    {formatMoney(purchase.total)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        purchase.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : purchase.status === "CANCELLED"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {purchase.status === "COMPLETED"
                        ? t("common.statusCompleted")
                        : purchase.status === "CANCELLED"
                          ? t("common.statusCancelled")
                          : t("common.statusDraft")}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-center gap-3">
                      <Link
                        href={`/dashboard/purchases/${purchase.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye size={18} />
                      </Link>
                      {purchase.status === "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => setCancelId(purchase.id)}
                          className="text-destructive hover:opacity-80"
                          aria-label={t("purchases.cancelAria")}
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </ContextMenuSurface>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
        )}
      </BulkListShell>

      <ConfirmDialog
        open={Boolean(cancelId)}
        title={t("purchases.cancelTitle")}
        description={t("purchases.cancelConfirm")}
        confirmText={t("common.cancel")}
        onCancel={() => setCancelId(null)}
        onConfirm={async () => {
          const id = cancelId;
          setCancelId(null);
          if (id) await cancelPurchase(id);
        }}
      />
    </div>
  );
}
