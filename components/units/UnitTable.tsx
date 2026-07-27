"use client";
import { formatDate } from "@/lib/utils/datetime";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DeleteUnitButton from "./DeleteUnitButton";
import { useT } from "@/components/i18n/LocaleProvider";

type Unit = {
  id: string;
  name: string;
  symbol: string;
  active: boolean;
  createdAt: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export default function UnitTable() {
  const { t } = useT();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "10",
      });
      if (search.trim()) params.set("q", search.trim());

      const response = await fetch(`/api/units?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setUnits(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchUnits();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [fetchUnits]);

  return (
    <div className="rek-table-shell">
      <div className="border-b border-border p-3 sm:p-4">
        <input
          type="text"
          placeholder={t("units.searchPlaceholder")}
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="w-full max-w-full rounded-2xl border border-border bg-background p-3 text-foreground outline-none focus:border-primary"
        />
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">{t("common.wait")}</div>
      ) : units.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          {t("units.notFound")}
        </div>
      ) : (
        <div className="rek-table-wrap">
          <table className="w-full min-w-[480px] sm:min-w-[560px]">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="p-4 text-right">{t("units.nameLabel")}</th>
                <th className="p-4 text-right">{t("units.symbolLabel")}</th>
                <th className="p-4 text-right">{t("common.status")}</th>
                <th className="p-4 text-right">{t("units.colDate")}</th>
                <th className="p-4 text-center">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr
                  key={unit.id}
                  className="border-t border-border hover:bg-secondary/40"
                >
                  <td className="p-4 font-semibold text-foreground">
                    {unit.name}
                  </td>
                  <td className="p-4 font-semibold text-primary">{unit.symbol}</td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        unit.active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {unit.active ? t("common.active") : t("common.inactive")}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {formatDate(unit.createdAt)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-3">
                      <Link
                        href={`/dashboard/units/${unit.id}/edit`}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-[var(--brand-hover)]"
                      >
                        {t("common.edit")}
                      </Link>
                      <DeleteUnitButton id={unit.id} onDeleted={fetchUnits} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
        <p className="text-sm text-muted-foreground">
          {t("common.pagination", {
            total: pagination.total,
            page: pagination.page,
            totalPages: pagination.totalPages,
          })}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            {t("common.prevPage")}
          </button>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            {t("common.nextPage")}
          </button>
        </div>
      </div>
    </div>
  );
}
