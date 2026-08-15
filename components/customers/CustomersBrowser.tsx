"use client";
import { formatDate } from "@/lib/utils/datetime";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Phone, Search } from "lucide-react";
import DeleteCustomerButton from "./DeleteCustomerButton";
import { formatMoney } from "@/lib/utils/format";
import type { PartyStats } from "@/lib/parties/stats";
import { useT } from "@/components/i18n/LocaleProvider";

export default function CustomersBrowser({
  initialData,
}: {
  initialData: PartyStats[];
}) {
  const { t } = useT();
  const [rows, setRows] = useState(initialData);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "active" && !r.active) return false;
      if (filter === "inactive" && r.active) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.phone || "").includes(q)
      );
    });
  }, [rows, search, filter]);

  const filters = [
    { id: "all" as const, label: t("common.all") },
    { id: "active" as const, label: t("common.active") },
    { id: "inactive" as const, label: t("common.inactive") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("customers.searchPlaceholder")}
            className="h-11 w-full rounded-2xl border border-border bg-card pr-4 pl-9 text-sm outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          {t("customers.notFound")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <article
              key={c.id}
              className="rek-card flex flex-col gap-3 p-4 transition hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-black text-foreground">
                    {c.name}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone size={12} aria-hidden />
                    {c.phone || "—"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    c.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {c.active ? t("common.active") : t("common.inactive")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <Meta
                  label={t("customers.totalPurchases")}
                  value={`${formatMoney(c.totalPurchases)}`}
                />
                <Meta
                  label={t("customers.outstandingBalance")}
                  value={`${formatMoney(c.outstandingBalance)}`}
                />
                <Meta
                  label={t("customers.lastPurchase")}
                  value={
                    c.lastPurchaseAt
                      ? formatDate(c.lastPurchaseAt)
                      : "—"
                  }
                  className="col-span-2"
                />
              </div>

              <div className="mt-auto flex justify-end gap-1.5 border-t border-border pt-3">
                <Link
                  href={`/dashboard/customers/${c.id}/edit`}
                  className="inline-flex size-9 items-center justify-center rounded-xl bg-secondary text-primary"
                  aria-label={t("common.edit")}
                >
                  <Pencil size={16} />
                </Link>
                <DeleteCustomerButton
                  id={c.id}
                  name={c.name}
                  onDeleted={() =>
                    setRows((prev) => prev.filter((r) => r.id !== c.id))
                  }
                  onRestored={() =>
                    setRows((prev) =>
                      prev.some((r) => r.id === c.id) ? prev : [c, ...prev]
                    )
                  }
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Meta({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-muted/50 px-3 py-2 ${className}`}>
      <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
      <p className="font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
