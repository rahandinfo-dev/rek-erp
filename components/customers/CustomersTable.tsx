"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import DeleteCustomerButton from "./DeleteCustomerButton";
import BulkActionBar from "@/components/bulk/BulkActionBar";
import { useBulkSelection } from "@/lib/bulk/useSelection";

export type CustomerRow = {
  id: string;
  name: string;
  code: string;
  phone?: string | null;
  email?: string | null;
  active: boolean;
};

export default function CustomersTable({
  initialData,
}: {
  initialData: CustomerRow[];
}) {
  const [customers, setCustomers] = useState(initialData);
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

  const columns: DataTableColumn<CustomerRow>[] = [
    {
      id: "name",
      header: "ناو",
      accessor: (r) => r.name,
      cell: (r) => <span className="font-medium">{r.name}</span>,
    },
    { id: "code", header: "کۆد", accessor: (r) => r.code },
    { id: "phone", header: "مۆبایل", accessor: (r) => r.phone || "-" },
    { id: "email", header: "ئیمەیڵ", accessor: (r) => r.email || "-" },
    {
      id: "active",
      header: "دۆخ",
      accessor: (r) => (r.active ? "چالاک" : "ناچالاک"),
      cell: (r) => (
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            r.active
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {r.active ? "چالاک" : "ناچالاک"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <BulkActionBar
        moduleKey="customers"
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
        data={customers}
        columns={columns}
        getRowId={(r) => r.id}
        searchPlaceholder="گەڕان بە ناو یان کۆد..."
        searchFilter={(r, q) =>
          r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
        }
        emptyMessage="هیچ کڕیارێک نەدۆزرایەوە."
        selection={{
          selectedIds: selection.selectedIds,
          onChange: selection.setIds,
        }}
        onIdsMeta={onIdsMeta}
        quickActions={{
          moduleKey: "customers",
          getLabel: (r) => r.name,
          getHref: (r) => `/dashboard/customers/${r.id}/edit`,
          getEditHref: (r) => `/dashboard/customers/${r.id}/edit`,
        }}
        actions={(customer) => (
          <>
            <Link
              href={`/dashboard/customers/${customer.id}/edit`}
              className="text-blue-600 hover:text-blue-800"
            >
              <Pencil size={18} />
            </Link>
            <DeleteCustomerButton
              id={customer.id}
              name={customer.name}
              onDeleted={() =>
                setCustomers((prev) =>
                  prev.filter((c) => c.id !== customer.id)
                )
              }
              onRestored={() =>
                setCustomers((prev) =>
                  prev.some((c) => c.id === customer.id)
                    ? prev
                    : [customer, ...prev]
                )
              }
            />
          </>
        )}
      />
    </div>
  );
}
