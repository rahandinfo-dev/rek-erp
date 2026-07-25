"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import DeleteCategoryButton from "./DeleteCategoryButton";
import BulkListShell from "@/components/bulk/BulkListShell";
import ContextMenuSurface from "@/components/quick-actions/ContextMenuSurface";

type Category = {
  id: string;
  name: string;
  description: string | null;
};

type Props = {
  categories: Category[];
};

export default function CategoryTable({ categories }: Props) {
  return (
    <BulkListShell
      moduleKey="categories"
      ids={categories.map((c) => c.id)}
      labels={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
    >
      {({ isSelected, toggle, headerCheckbox }) => (
        <div className="rek-table-shell w-full max-w-full min-w-0">
          <div className="rek-table-wrap">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="border-b bg-muted/70">
                  <th className="p-3 text-right text-sm font-bold sm:p-4 md:p-5">
                    {headerCheckbox}
                  </th>
                  <th className="p-3 text-right text-sm font-bold sm:p-4 md:p-5">
                    ناو
                  </th>
                  <th className="p-3 text-right text-sm font-bold sm:p-4 md:p-5">
                    وەسف
                  </th>
                  <th className="p-3 text-center text-sm font-bold sm:p-4 md:p-5">
                    کردار
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <ContextMenuSurface
                    key={category.id}
                    as="tr"
                    className="border-b border-border"
                    record={{
                      id: category.id,
                      moduleKey: "categories",
                      label: category.name,
                      href: `/dashboard/category/${category.id}/edit`,
                      editHref: `/dashboard/category/${category.id}/edit`,
                      entityType: "Category",
                    }}
                  >
                    <td className="p-3 sm:p-4 md:p-5">
                      <input
                        type="checkbox"
                        checked={isSelected(category.id)}
                        onChange={() => toggle(category.id)}
                        aria-label={`Select ${category.name}`}
                      />
                    </td>
                    <td className="max-w-[12rem] truncate p-3 font-semibold sm:p-4 md:p-5">
                      {category.name}
                    </td>
                    <td className="max-w-[18rem] truncate p-3 text-muted-foreground sm:p-4 md:p-5">
                      {category.description || "-"}
                    </td>
                    <td className="p-3 sm:p-4 md:p-5">
                      <div className="flex justify-center gap-3">
                        <Link
                          href={`/dashboard/category/${category.id}/edit`}
                          className="text-primary"
                          aria-label="دەستکاری"
                        >
                          <Pencil size={18} />
                        </Link>
                        <DeleteCategoryButton
                          id={category.id}
                          name={category.name}
                        />
                      </div>
                    </td>
                  </ContextMenuSurface>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </BulkListShell>
  );
}
