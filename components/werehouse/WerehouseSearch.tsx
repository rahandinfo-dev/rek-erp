"use client";

import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useT } from "@/components/i18n/LocaleProvider";
import { SearchInput } from "@/components/ui/SearchInput";

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
    <SearchInput
      wrapperClassName="w-full max-w-md"
      iconSize={20}
      iconClassName="text-slate-400"
      id="warehouse-search"
      aria-label={t("warehouses.searchLabel")}
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder={t("warehouses.searchPlaceholder")}
      className="h-12 w-full rounded-2xl border border-slate-300 bg-white outline-none transition focus:border-[#FFAE42]"
      endAdornment={search ? (
        <button
          type="button"
          aria-label={t("common.clearSearch")}
          onClick={() => setSearch("")}
          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
        >
          <X size={18} />
        </button>
      ) : null}
    />
  );
}
