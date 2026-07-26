"use client";
import { formatDate } from "@/lib/utils/datetime";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Download,
  Eye,
  FileText,
  Printer,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import { formatMoney } from "@/lib/utils/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/invoices/payment";
import type { PaymentMethod } from "@/lib/prisma/client";
import BulkActionBar from "@/components/bulk/BulkActionBar";
import { useBulkSelection } from "@/lib/bulk/useSelection";

export type InvoiceRow = {
  id: string;
  invoiceNo: string;
  customerName: string;
  warehouseName: string;
  grandTotal: string | number;
  paymentMethod: PaymentMethod;
  status: "ACTIVE" | "VOID";
  invoiceDate: string | Date;
  invoiceTime: string | Date;
  createdByName: string | null;
  printCount: number;
  pdfCount: number;
};

export default function InvoicesTable({
  initialData,
}: {
  initialData: InvoiceRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialData);
  const [busyId, setBusyId] = useState<string | null>(null);
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

  async function handleDuplicate(row: InvoiceRow) {
    setBusyId(row.id);
    try {
      router.push(`/dashboard/sales/new?duplicate=${row.id}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(row: InvoiceRow) {
    if (row.status === "VOID") return;
    if (
      !confirm(
        `Ù¾Ø³ÙˆÙˆÙ„Û•ÛŒ ${row.invoiceNo} Ù‡Û•ÚµØ¨ÙˆÛ•Ø´ÛŽÙ†ÛŒØªÛ•ÙˆÛ•ØŸ Ú©Û†Ú¯Ø§ Ø¯Û•Ú¯Û•Ú•ÛŽØªÛ•ÙˆÛ• Ø¦Û•Ú¯Û•Ø± ÙØ±Û†Ø´ØªÙ† ØªÛ•ÙˆØ§Ùˆ Ø¨ÙˆÙˆØ¨ÛŽØª.`
      )
    ) {
      return;
    }

    setBusyId(row.id);
    try {
      const { softDeleteWithUndo } = await import("@/lib/delete/withUndo");
      await softDeleteWithUndo({
        deleteUrl: `/api/invoices/${row.id}`,
        restoreUrl: `/api/invoices/${row.id}/restore`,
        module: "invoices",
        title: "Invoice voided",
        message: `${row.invoiceNo} â€” Undo`,
        entityType: "Invoice",
        entityId: row.id,
        onSoftDeleted: () => {
          setRows((prev) =>
            prev.map((r) => (r.id === row.id ? { ...r, status: "VOID" } : r))
          );
          router.refresh();
        },
        onRestored: () => {
          setRows((prev) =>
            prev.map((r) => (r.id === row.id ? { ...r, status: "ACTIVE" } : r))
          );
          router.refresh();
        },
      });
    } finally {
      setBusyId(null);
    }
  }

  const columns: DataTableColumn<InvoiceRow>[] = [
    {
      id: "invoiceNo",
      header: "Ú˜Ù…Ø§Ø±Û•ÛŒ Ù¾Ø³ÙˆÙˆÙ„Û•",
      accessor: (row) => row.invoiceNo,
      cell: (row) => <span className="font-bold">{row.invoiceNo}</span>,
    },
    {
      id: "customer",
      header: "Ú©Ú•ÛŒØ§Ø±",
      accessor: (row) => row.customerName,
    },
    {
      id: "date",
      header: "Ø¨Û•Ø±ÙˆØ§Ø±",
      accessor: (row) => new Date(row.invoiceDate).getTime(),
      cell: (row) => (
        <span>{formatDate(row.invoiceDate)}</span>
      ),
    },
    {
      id: "warehouse",
      header: "Ú©Û†Ú¯Ø§",
      accessor: (row) => row.warehouseName,
    },
    {
      id: "payment",
      header: "Ù¾Ø§Ø±Û•Ø¯Ø§Ù†",
      accessor: (row) => row.paymentMethod,
      cell: (row) => PAYMENT_METHOD_LABELS[row.paymentMethod],
    },
    {
      id: "status",
      header: "Ø¯Û†Ø®",
      accessor: (row) => row.status,
      cell: (row) => (
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            row.status === "ACTIVE"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {row.status === "ACTIVE" ? "Ú†Ø§Ù„Ø§Ú©" : "Ù‡Û•ÚµÙˆÛ•Ø´Ø§ÙˆÛ•"}
        </span>
      ),
    },
    {
      id: "total",
      header: "Ú©Û†ÛŒ Ú¯Ø´ØªÛŒ",
      accessor: (row) => Number(row.grandTotal),
      cell: (row) => `${formatMoney(row.grandTotal)} IQD`,
    },
  ];

  return (
    <div className="space-y-3">
      <BulkActionBar
        moduleKey="invoices"
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
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      searchPlaceholder="Ú¯Û•Ú•Ø§Ù† Ø¨Û• Ú˜Ù…Ø§Ø±Û•ÛŒ Ù¾Ø³ÙˆÙˆÙ„Û• ÛŒØ§Ù† Ú©Ú•ÛŒØ§Ø±..."
      searchFilter={(row, q) =>
        row.invoiceNo.toLowerCase().includes(q) ||
        row.customerName.toLowerCase().includes(q) ||
        row.warehouseName.toLowerCase().includes(q)
      }
      emptyMessage="Ù‡ÛŒÚ† Ù¾Ø³ÙˆÙˆÙ„Û•ÛŒÛ•Ú© Ù†ÛŒÛŒÛ•. ÙØ±Û†Ø´ØªÙ†ÛŽÚ©ÛŒ ØªÛ•ÙˆØ§Ùˆ Ù¾Ø³ÙˆÙˆÙ„Û• Ø¯Ø±ÙˆØ³Øª Ø¯Û•Ú©Ø§Øª."
      selection={{
        selectedIds: selection.selectedIds,
        onChange: selection.setIds,
      }}
      onIdsMeta={onIdsMeta}
      quickActions={{
        moduleKey: "invoices",
        getLabel: (row) => row.invoiceNo,
        getHref: (row) => `/dashboard/invoices/${row.id}`,
      }}
      toolbar={
        <Link
          href="/dashboard/sales/new"
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#FFAE42] px-4 text-sm font-semibold text-white"
        >
          <FileText size={16} />
          ÙØ±Û†Ø´ØªÙ†ÛŒ Ù†ÙˆÛŽ
        </Link>
      }
      actions={(row) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/dashboard/invoices/${row.id}`}
            className="inline-flex size-8 items-center justify-center rounded-lg text-[#FFAE42] hover:bg-[#FFF8EF]"
            title="Ø¨ÛŒÙ†ÛŒÙ†"
          >
            <Eye size={16} />
          </Link>
          <Link
            href={`/dashboard/invoices/${row.id}?print=1`}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50"
            title="Ú†Ø§Ù¾"
          >
            <Printer size={16} />
          </Link>
          <Link
            href={`/dashboard/invoices/${row.id}?pdf=1`}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50"
            title="Ø¯Ø§Ú¯Ø±ØªÙ†ÛŒ PDF"
          >
            <Download size={16} />
          </Link>
          <button
            type="button"
            disabled={busyId === row.id}
            onClick={() => void handleDuplicate(row)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            title="Ø¯ÙˆÙˆØ¨Ø§Ø±Û•Ú©Ø±Ø¯Ù†Û•ÙˆÛ•"
          >
            <Copy size={16} />
          </button>
          <button
            type="button"
            disabled={busyId === row.id || row.status === "VOID"}
            onClick={() => void handleDelete(row)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
            title="Ø³Ú•ÛŒÙ†Û•ÙˆÛ•"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    />
    </div>
  );
}
