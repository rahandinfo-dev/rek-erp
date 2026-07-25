"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Search } from "lucide-react";
import DeleteSupplierButton from "./DeleteSupplierButton";
import BulkListShell from "@/components/bulk/BulkListShell";
import ContextMenuSurface from "@/components/quick-actions/ContextMenuSurface";

export type SupplierRow = {
  id: string;
  name: string;
  code: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  active: boolean;
};

export default function SuppliersTable({
  initialData,
}: {
  initialData: SupplierRow[];
}) {
  const [suppliers, setSuppliers] = useState(initialData);
  const [search, setSearch] = useState("");

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) =>
      supplier.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [suppliers, search]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={20}
        />

        <input
          type="text"
          placeholder="گەڕان بە ناوی دابینکەر..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-slate-300 py-3 pl-12 pr-4 outline-none focus:border-[#FFAE42]"
        />
      </div>

      <BulkListShell
        moduleKey="suppliers"
        ids={filteredSuppliers.map((s) => s.id)}
        labels={Object.fromEntries(
          filteredSuppliers.map((s) => [s.id, s.name])
        )}
      >
        {({ isSelected, toggle, headerCheckbox }) => (
      <div className="rek-table-shell">
        <div className="rek-table-wrap">
        <table className="w-full min-w-[520px] sm:min-w-[640px]">
          <thead className="bg-slate-100">
            <tr className="text-right">
              <th className="px-5 py-4">{headerCheckbox}</th>
              <th className="px-5 py-4">ناو</th>
              <th className="px-5 py-4">کۆد</th>
              <th className="px-5 py-4">مۆبایل</th>
              <th className="px-5 py-4">ئیمەیڵ</th>
              <th className="px-5 py-4">دۆخ</th>
              <th className="px-5 py-4 text-center">کردار</th>
            </tr>
          </thead>

          <tbody>
            {filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500">
                  هیچ دابینکەرێک نەدۆزرایەوە.
                </td>
              </tr>
            ) : (
              filteredSuppliers.map((supplier) => (
                <ContextMenuSurface
                  key={supplier.id}
                  as="tr"
                  className="border-t hover:bg-slate-50"
                  record={{
                    id: supplier.id,
                    moduleKey: "suppliers",
                    label: supplier.name,
                    href: `/dashboard/suppliers/${supplier.id}/edit`,
                    editHref: `/dashboard/suppliers/${supplier.id}/edit`,
                    entityType: "Supplier",
                    archived: !supplier.active,
                  }}
                >
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected(supplier.id)}
                      onChange={() => toggle(supplier.id)}
                      aria-label={`Select ${supplier.name}`}
                    />
                  </td>
                  <td className="px-5 py-4 font-medium">{supplier.name}</td>
                  <td className="px-5 py-4">{supplier.code}</td>
                  <td className="px-5 py-4">{supplier.phone || "-"}</td>
                  <td className="px-5 py-4">{supplier.email || "-"}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        supplier.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {supplier.active ? "چالاک" : "ناچالاک"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-center gap-3">
                      <Link
                        href={`/dashboard/suppliers/${supplier.id}/edit`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Pencil size={18} />
                      </Link>
                      <DeleteSupplierButton
                        id={supplier.id}
                        name={supplier.name}
                        onDeleted={() =>
                          setSuppliers((prev) =>
                            prev.filter((s) => s.id !== supplier.id)
                          )
                        }
                        onRestored={() =>
                          setSuppliers((prev) =>
                            prev.some((s) => s.id === supplier.id)
                              ? prev
                              : [supplier, ...prev]
                          )
                        }
                      />
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
    </div>
  );
}
