"use client";
import { formatDate } from "@/lib/utils/datetime";

import { useEffect, useState } from "react";
import Link from "next/link";
import DeleteBrandButton from "./DeleteBrandButton";

type Brand = {
  id: string;
  name: string;
  createdAt: string;
};

export default function BrandTable() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchBrands();
  }, []);

  async function fetchBrands() {
    try {
      const response = await fetch("/api/brands");
      const data = await response.json();

      if (data.success) {
        setBrands(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center">
        چاوەڕێ بکە...
      </div>
    );
  }

  return (
    <div className="rek-table-shell w-full max-w-full min-w-0">
      <div className="border-b border-border p-3 sm:p-4">
        <input
          type="text"
          placeholder="گەڕان بە ناوی براند..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-full rounded-2xl border border-border bg-card p-3 outline-none focus:border-primary"
        />
      </div>

      {filteredBrands.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          هیچ براندێک نەدۆزرایەوە.
        </div>
      ) : (
        <div className="rek-table-wrap">
          <table className="w-full min-w-[420px]">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="p-3 text-right text-sm font-bold sm:p-4">ناو</th>
                <th className="p-3 text-right text-sm font-bold sm:p-4">
                  بەرواری دروستکردن
                </th>
                <th className="p-3 text-center text-sm font-bold sm:p-4">
                  کردار
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBrands.map((brand) => (
                <tr
                  key={brand.id}
                  className="border-t border-border hover:bg-muted/50"
                >
                  <td className="max-w-[12rem] truncate p-3 sm:p-4">
                    {brand.name}
                  </td>
                  <td className="whitespace-nowrap p-3 sm:p-4">
                    {formatDate(brand.createdAt)}
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Link
                        href={`/dashboard/brands/${brand.id}/edit`}
                        className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:bg-[var(--brand-hover)] sm:px-4"
                      >
                        دەستکاری
                      </Link>
                      <DeleteBrandButton
                        id={brand.id}
                        onDeleted={fetchBrands}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
