"use client";
import { formatDate } from "@/lib/utils/datetime";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { Eye, FileText, XCircle } from "lucide-react";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import { formatMoney } from "@/lib/utils/format";
import BulkActionBar from "@/components/bulk/BulkActionBar";
import { useBulkSelection } from "@/lib/bulk/useSelection";
import { useT } from "@/components/i18n/LocaleProvider";

export type SaleRow = {
  id: string;
  invoiceNo: string;
  saleDate: string;
  status: string;
  total: string | number;
  customer: { name: string };
  warehouse: { name: string };
  invoiceId?: string | null;
};

export default function SalesTable({ initialData }: { initialData: SaleRow[] }) {
  const { t } = useT();
  const [sales, setSales] = useState(initialData);
  const [, startTransition] = useTransition();
  const selection = useBulkSelection();
  const [idsMeta, setIdsMeta] = useState({
    allIds: [] as string[],
    filteredIds: [] as string[],
    pageIds: [] as string[],
  });
  const onIdsMeta = useCallback(
    (meta: {
      allIds: string[];
      filteredIds: string[];
      pageIds: string[];
    }) => {
      window.setTimeout(() => setIdsMeta(meta), 0);
    },
    []
  );

  async function cancelSale(id: string) {
    if (!confirm(t("sales.cancelConfirm"))) return;

    const { softDeleteWithUndo } = await import("@/lib/delete/withUndo");
    const result = await softDeleteWithUndo({
      deleteUrl: `/api/sales/${id}`,
      restoreUrl: `/api/sales/${id}/restore`,
      module: "sales",
      title: t("sales.cancelledTitle"),
      entityType: t("sales.entityType"),
      entityId: id,
      onSoftDeleted: () => {
        startTransition(() => {
          setSales((prev) =>
            prev.map((s) => (s.id === id ? { ...s, status: "CANCELLED" } : s))
          );
        });
      },
      onRestored: () => {
        startTransition(() => {
          setSales((prev) =>
            prev.map((s) => (s.id === id ? { ...s, status: "COMPLETED" } : s))
          );
        });
      },
    });
    if (!result.ok) return;
  }

  const columns: DataTableColumn<SaleRow>[] = [
    {
      id: "invoiceNo",
      header: t("common.invoice"),
      accessor: (s) => s.invoiceNo,
      cell: (s) => <span className="font-medium">{s.invoiceNo}</span>,
    },
    {
      id: "customer",
      header: t("sales.customerOptional"),
      accessor: (s) => s.customer.name,
    },
    {
      id: "warehouse",
      header: t("common.warehouse"),
      accessor: (s) => s.warehouse.name,
    },
    {
      id: "saleDate",
      header: t("common.date"),
      accessor: (s) => formatDate(s.saleDate),
    },
    {
      id: "total",
      header: t("common.total"),
      accessor: (s) => Number(s.total),
      cell: (s) => `${formatMoney(s.total)}`,
    },
    {
      id: "status",
      header: t("common.status"),
      accessor: (s) => s.status,
      cell: (s) => (
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            s.status === "COMPLETED"
              ? "bg-green-100 text-green-700"
              : s.status === "CANCELLED"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {s.status === "COMPLETED"
            ? t("common.statusCompleted")
            : s.status === "CANCELLED"
              ? t("common.statusCancelled")
              : t("common.statusDraft")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <BulkActionBar
        moduleKey="sales"
        selectedIds={selection.selectedIds}
        pageIds={idsMeta.pageIds}
        filteredIds={idsMeta.filteredIds}
        allIds={idsMeta.allIds}
        onSelectPage={() => selection.selectPage(idsMeta.pageIds)}
        onSelectFiltered={() => selection.selectFiltered(idsMeta.filteredIds)}
        onSelectAll={() => selection.selectAll(idsMeta.allIds)}
        onDeselectAll={selection.deselectAll}
      />
    <DataTable
      data={sales}
      columns={columns}
      getRowId={(s) => s.id}
      searchPlaceholder={t("sales.searchPlaceholder")}
      searchFilter={(s, q) =>
        s.invoiceNo.toLowerCase().includes(q) ||
        s.customer.name.toLowerCase().includes(q)
      }
      emptyMessage={t("sales.notFound")}
      selection={{
        selectedIds: selection.selectedIds,
        onChange: selection.setIds,
      }}
      onIdsMeta={onIdsMeta}
      quickActions={{
        moduleKey: "sales",
        getLabel: (s) => s.invoiceNo,
        getHref: (s) => `/dashboard/sales/${s.id}`,
        isDeleted: (s) => s.status === "CANCELLED",
      }}
      toolbar={
        <Link
          href="/dashboard/invoices"
          className="inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold text-[#FFAE42]"
        >
          <FileText size={16} />
          {t("nav.invoices")}
        </Link>
      }
      actions={(sale) => (
        <>
          {sale.invoiceId ? (
            <Link
              href={`/dashboard/invoices/${sale.invoiceId}`}
              className="text-[#FFAE42] hover:text-[#E8942A]"
              title={t("common.invoice")}
            >
              <FileText size={18} />
            </Link>
          ) : null}
          <Link
            href={`/dashboard/sales/${sale.id}`}
            className="text-blue-600 hover:text-blue-800"
          >
            <Eye size={18} />
          </Link>
          {sale.status === "COMPLETED" && (
            <button
              type="button"
              onClick={() => cancelSale(sale.id)}
              className="text-red-600 hover:text-red-800"
            >
              <XCircle size={18} />
            </button>
          )}
        </>
      )}
    />
    </div>
  );
}
