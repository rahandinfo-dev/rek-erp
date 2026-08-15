"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { Button } from "@/components/ui/button";
import { useQuickActionsOptional } from "@/lib/quick-actions/provider";
import { entityTypeFor } from "@/lib/bulk/modules";
import {
  editHrefFor,
  viewHrefFor,
} from "@/lib/quick-actions/urls";
import type { QuickActionRecord } from "@/lib/quick-actions/types";
import SelectionQuickActions from "@/components/quick-actions/SelectionQuickActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { useT } from "@/components/i18n/LocaleProvider";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  accessor: (row: T) => string | number | null | undefined;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
};

export type DataTableSelection = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export type DataTableQuickActions<T> = {
  moduleKey: string;
  getLabel?: (row: T) => string;
  getHref?: (row: T) => string;
  getEditHref?: (row: T) => string;
  isDeleted?: (row: T) => boolean;
  isArchived?: (row: T) => boolean;
};

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  pageSizeOptions?: number[];
  actions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  toolbar?: React.ReactNode;
  /** Optional multi-select — additive, off by default */
  selection?: DataTableSelection;
  /** Emits filtered + page ids for bulk helpers */
  onIdsMeta?: (meta: {
    allIds: string[];
    filteredIds: string[];
    pageIds: string[];
  }) => void;
  /** Smart context menu + selection quick actions */
  quickActions?: DataTableQuickActions<T>;
};

function DataTableInner<T>({
  data,
  columns,
  getRowId,
  searchPlaceholder,
  searchFilter,
  pageSizeOptions = [10, 25, 50],
  actions,
  emptyMessage,
  toolbar,
  selection,
  onIdsMeta,
  quickActions,
}: DataTableProps<T>) {
  const { t } = useT();
  const resolvedSearchPlaceholder =
    searchPlaceholder ?? t("table.searchPlaceholder");
  const resolvedEmptyMessage = emptyMessage ?? t("common.empty");
  const qa = useQuickActionsOptional();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [sortId, setSortId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] ?? 10);
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.map((c) => [c.id, true]))
  );
  const [columnsOpen, setColumnsOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return data;

    return data.filter((row) => {
      if (searchFilter) return searchFilter(row, q);
      return columns.some((col) =>
        String(col.accessor(row) ?? "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [data, debouncedSearch, searchFilter, columns]);

  const sorted = useMemo(() => {
    if (!sortId) return filtered;
    const col = columns.find((c) => c.id === sortId);
    if (!col) return filtered;

    return [...filtered].sort((a, b) => {
      const av = col.accessor(a);
      const bv = col.accessor(b);
      const aNum = Number(av);
      const bNum = Number(bv);
      let cmp = 0;

      if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && av !== "" && bv !== "") {
        cmp = aNum - bNum;
      } else {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""), "ku", {
          sensitivity: "base",
        });
      }

      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortId, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sorted, currentPage, pageSize]
  );

  const visibleColumns = useMemo(
    () => columns.filter((c) => visible[c.id] !== false),
    [columns, visible]
  );

  const allIds = useMemo(() => data.map(getRowId), [data, getRowId]);
  const filteredIds = useMemo(() => sorted.map(getRowId), [sorted, getRowId]);
  const pageIds = useMemo(() => pageRows.map(getRowId), [pageRows, getRowId]);

  // Callers pass inline `columns` / `getRowId` / `onIdsMeta`, so the arrays
  // above get fresh identities on every parent render. Keying the effect on
  // the id *contents* stops it from calling back — and re-rendering the
  // parent — when nothing actually changed.
  const idsKey = `${allIds.join(",")}|${filteredIds.join(",")}|${pageIds.join(
    ","
  )}`;
  const idsRef = useRef({ allIds, filteredIds, pageIds });
  const onIdsMetaRef = useRef(onIdsMeta);
  useEffect(() => {
    idsRef.current = { allIds, filteredIds, pageIds };
    onIdsMetaRef.current = onIdsMeta;
  });

  useEffect(() => {
    if (!onIdsMetaRef.current) return;
    const id = window.setTimeout(() => {
      onIdsMetaRef.current?.({ ...idsRef.current });
    }, 0);
    return () => window.clearTimeout(id);
  }, [idsKey]);

  const selectedSet = useMemo(
    () => new Set(selection?.selectedIds || []),
    [selection?.selectedIds]
  );
  const pageAllSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));

  function toggleRow(id: string) {
    if (!selection) return;
    const next = new Set(selection.selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selection.onChange([...next]);
  }

  function togglePage() {
    if (!selection) return;
    if (pageAllSelected) {
      const drop = new Set(pageIds);
      selection.onChange(selection.selectedIds.filter((id) => !drop.has(id)));
    } else {
      const next = new Set(selection.selectedIds);
      for (const id of pageIds) next.add(id);
      selection.onChange([...next]);
    }
  }

  function toggleSort(id: string) {
    if (sortId === id) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortId(id);
      setSortDir("asc");
    }
  }

  function toRecord(row: T): QuickActionRecord {
    const id = getRowId(row);
    const moduleKey = quickActions?.moduleKey || "products";
    return {
      id,
      moduleKey,
      label:
        quickActions?.getLabel?.(row) ||
        String(columns[0]?.accessor(row) ?? id),
      href: quickActions?.getHref?.(row) || viewHrefFor(moduleKey, id),
      editHref:
        quickActions?.getEditHref?.(row) || editHrefFor(moduleKey, id),
      entityType: entityTypeFor(moduleKey),
      deleted: quickActions?.isDeleted?.(row),
      archived: quickActions?.isArchived?.(row),
    };
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {quickActions && selection && selection.selectedIds.length > 0 ? (
        <SelectionQuickActions
          moduleKey={quickActions.moduleKey}
          selectedIds={selection.selectedIds}
          getRecord={(id) => {
            const row = data.find((r) => getRowId(r) === id);
            return row ? toRecord(row) : null;
          }}
        />
      ) : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          wrapperClassName="w-full max-w-md"
          iconSize={18}
          iconClassName="text-muted-foreground"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={resolvedSearchPlaceholder}
          aria-label={t("table.searchAria")}
          className="h-11 w-full rounded-2xl border border-border bg-card py-2 text-sm text-foreground shadow-[var(--shadow-xs)] outline-none transition focus:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/35"
        />

        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => setColumnsOpen((v) => !v)}
              aria-expanded={columnsOpen}
              aria-haspopup="listbox"
              aria-label={t("table.columnsToggle")}
              className="shadow-none"
            >
              <Columns3 size={16} aria-hidden />
              {t("table.columns")}
            </Button>
            {columnsOpen ? (
              <div
                role="listbox"
                className="absolute left-0 z-20 mt-2 w-56 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-[var(--shadow-md)]"
              >
                {columns.map((col) => (
                  <label
                    key={col.id}
                    className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={visible[col.id] !== false}
                      onChange={(e) =>
                        setVisible((prev) => ({
                          ...prev,
                          [col.id]: e.target.checked,
                        }))
                      }
                    />
                    {col.header}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rek-table-shell min-w-0">
        <div className="rek-table-wrap max-h-[min(70vh,640px)] overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-0 sm:min-w-[640px] md:min-w-[720px]">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
              <tr className="text-right text-[13px] text-muted-foreground">
                {selection ? (
                  <th
                    className="border-b border-border px-3 py-3.5 sm:px-4"
                    scope="col"
                  >
                    <input
                      type="checkbox"
                      checked={pageAllSelected}
                      onChange={togglePage}
                      aria-label={t("table.selectCurrentPage")}
                      className="focus-visible:ring-[3px] focus-visible:ring-ring/35"
                    />
                  </th>
                ) : null}
                {visibleColumns.map((col) => (
                  <th
                    key={col.id}
                    className={cn(
                      "border-b border-border px-3 py-3.5 font-bold sm:px-4",
                      col.className
                    )}
                    scope="col"
                  >
                    {col.sortable === false ? (
                      col.header
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 transition hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
                      >
                        {col.header}
                        {sortId !== col.id ? (
                          <ArrowUpDown size={14} aria-hidden />
                        ) : sortDir === "asc" ? (
                          <ArrowUp size={14} aria-hidden />
                        ) : (
                          <ArrowDown size={14} aria-hidden />
                        )}
                      </button>
                    )}
                  </th>
                ))}
                {actions ? (
                  <th
                    className="border-b border-border px-3 py-3.5 text-center font-bold sm:px-4"
                    scope="col"
                  >
                    کردار
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      visibleColumns.length +
                      (actions ? 1 : 0) +
                      (selection ? 1 : 0)
                    }
                    className="px-4 py-10 text-center"
                  >
                    <EmptyState
                      title={resolvedEmptyMessage}
                      description={t("table.emptyFilterHint")}
                      className="border-0 bg-transparent py-8"
                    />
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const record = quickActions ? toRecord(row) : null;
                  const bind = record && qa ? qa.bindContextMenu(record) : null;
                  return (
                  <tr
                    key={getRowId(row)}
                    data-state={
                      selectedSet.has(getRowId(row)) ? "selected" : undefined
                    }
                    className="transition-colors duration-150 hover:bg-muted/45 data-[state=selected]:bg-primary/5"
                    onContextMenu={bind?.onContextMenu}
                    onTouchStart={bind?.onTouchStart}
                    onTouchEnd={bind?.onTouchEnd}
                    onTouchMove={bind?.onTouchMove}
                    onFocus={bind?.onFocus}
                    tabIndex={quickActions ? 0 : undefined}
                  >
                    {selection ? (
                      <td className="border-b border-border/70 px-3 py-3.5 sm:px-4">
                        <input
                          type="checkbox"
                          checked={selectedSet.has(getRowId(row))}
                          onChange={() => toggleRow(getRowId(row))}
                          aria-label={t("table.selectRow", { id: getRowId(row) })}
                          className="focus-visible:ring-[3px] focus-visible:ring-ring/35"
                        />
                      </td>
                    ) : null}
                    {visibleColumns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          "border-b border-border/70 px-3 py-3.5 text-sm text-foreground sm:px-4",
                          col.className
                        )}
                      >
                        {col.cell
                          ? col.cell(row)
                          : String(col.accessor(row) ?? "—")}
                      </td>
                    ))}
                    {actions ? (
                      <td className="border-b border-border/70 px-3 py-3.5 sm:px-4">
                        <div className="flex justify-center gap-1.5">
                          {actions(row)}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {sorted.length} ئەنجام · پەڕەی {currentPage} لە {totalPages}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="rek-table-page-size">
            {t("table.rowsPerPage")}
          </label>
          <select
            id="rek-table-page-size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm shadow-[var(--shadow-xs)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / پەڕە
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="shadow-none"
          >
            <ChevronRight size={16} aria-hidden />
            پێشوو
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="shadow-none"
          >
            دواتر
            <ChevronLeft size={16} aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

const DataTable = memo(DataTableInner) as typeof DataTableInner;
export default DataTable;
