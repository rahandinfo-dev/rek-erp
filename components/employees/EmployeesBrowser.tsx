"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import EmployeeCard, {
  type EmployeeCardData,
} from "@/components/employees/EmployeeCard";
import BulkListShell from "@/components/bulk/BulkListShell";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  initialData: EmployeeCardData[];
};

export default function EmployeesBrowser({ initialData }: Props) {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | string>("all");

  const statuses = useMemo(() => {
    const set = new Set(initialData.map((e) => e.status));
    return Array.from(set);
  }, [initialData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialData.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (!q) return true;
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        (e.phone || "").includes(q) ||
        (e.position || "").toLowerCase().includes(q) ||
        (e.department || "").toLowerCase().includes(q)
      );
    });
  }, [initialData, search, status]);

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
            placeholder={t("employees.searchPlaceholder")}
            className="h-11 w-full rounded-2xl border border-border bg-card pr-4 pl-9 text-sm outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStatus("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              status === "all"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground"
            }`}
          >
            {t("common.all")}
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                status === s
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {t(`employees.statuses.${s}`) || s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          {t("employees.notFound")}
        </p>
      ) : (
        <BulkListShell
          moduleKey="employees"
          ids={filtered.map((e) => e.id)}
          labels={Object.fromEntries(
            filtered.map((e) => [e.id, e.fullName])
          )}
        >
          {({ isSelected, toggle }) => (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((employee) => (
                <div key={employee.id} className="relative">
                  <label className="absolute start-3 top-3 z-10 inline-flex items-center gap-2 rounded-lg bg-card/95 px-2 py-1 text-xs font-bold shadow-sm">
                    <input
                      type="checkbox"
                      checked={isSelected(employee.id)}
                      onChange={() => toggle(employee.id)}
                      aria-label={t("common.selectNamed", { name: employee.fullName })}
                    />
                    {t("employees.select")}
                  </label>
                  <EmployeeCard employee={employee} />
                </div>
              ))}
            </div>
          )}
        </BulkListShell>
      )}
    </div>
  );
}
