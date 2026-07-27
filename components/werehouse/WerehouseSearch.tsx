"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useT } from "@/components/i18n/LocaleProvider";

export default function WerehouseSearch() {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(initial);
  const debounced = useDebouncedValue(search, 400);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debounced) params.set("search", debounced);
    else params.delete("search");

    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;

    router.replace(`/dashboard/werehouse?${next}`);
  }, [debounced, router, searchParams]);

  return (
    <div className="relative w-full max-w-md">
      <Search
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
        size={20}
        aria-hidden
      />

      <label htmlFor="warehouse-search" className="sr-only">
        {t("warehouses.searchLabel")}
      </label>
      <input
        id="warehouse-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("warehouses.searchPlaceholder")}
        className="h-12 w-full rounded-2xl border border-slate-300 bg-white pr-12 pl-12 outline-none transition focus:border-[#FFAE42]"
      />

      {search ? (
        <button
          type="button"
          aria-label={t("common.clearSearch")}
          onClick={() => setSearch("")}
          className="absolute top-1/2 right-4 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
        >
          <X size={18} />
        </button>
      ) : null}
    </div>
  );
}
