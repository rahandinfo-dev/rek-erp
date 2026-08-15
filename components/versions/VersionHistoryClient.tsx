"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Copy,
  Download,
  Eye,
  GitCompare,
  History,
  RotateCcw,
  Search,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import VersionCompare, {
  type CompareDiff,
} from "@/components/versions/VersionCompare";
import type { EntityVersionRow } from "@/lib/versions/types";
import { VERSION_ACTION_LABELS } from "@/lib/versions/types";
import { versionPageHref } from "@/lib/versions/urls";
import { exportToCsv, exportToExcel } from "@/lib/export";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/LocaleProvider";

type Filters = {
  users: { id: string; fullName: string }[];
  entityTypes: string[];
};

export default function VersionHistoryClient() {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<EntityVersionRow[]>([]);
  const [filters, setFilters] = useState<Filters>({ users: [], entityTypes: [] });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [entityType, setEntityType] = useState(
    searchParams.get("entityType") || ""
  );
  const [entityId, setEntityId] = useState(searchParams.get("entityId") || "");
  const [action, setAction] = useState(searchParams.get("action") || "");
  const [userId, setUserId] = useState(searchParams.get("userId") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const [selected, setSelected] = useState<string[]>([]);
  const [viewRow, setViewRow] = useState<EntityVersionRow | null>(null);
  const [compareDiffs, setCompareDiffs] = useState<CompareDiff[] | null>(null);
  const [compareLabels, setCompareLabels] = useState({ left: "", right: "" });
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const focusId = searchParams.get("id");

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (entityType) p.set("entityType", entityType);
    if (entityId) p.set("entityId", entityId);
    if (action) p.set("action", action);
    if (userId) p.set("userId", userId);
    if (sort) p.set("sort", sort);
    p.set("page", String(page));
    p.set("pageSize", "25");
    p.set("filters", "1");
    return p.toString();
  }, [q, entityType, entityId, action, userId, sort, page]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/versions?${queryString}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.success) {
        appToast.error(json.message || "بارکردن سەرنەکەوت");
        return;
      }
      setItems(json.data.items || []);
      setTotal(json.data.pagination?.total || 0);
      setTotalPages(json.data.pagination?.totalPages || 1);
      if (json.data.filters) setFilters(json.data.filters);
    } catch {
      appToast.error(t("versionsUi.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [queryString, t]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!focusId) return;
    const t = window.setTimeout(() => {
      void fetch(`/api/versions/${focusId}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setViewRow(json.data);
        });
    }, 0);
    return () => window.clearTimeout(t);
  }, [focusId]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1]!, id];
      return [...prev, id];
    });
  }

  async function runCompare() {
    if (selected.length !== 2) {
      appToast.info(t("versionsUi.selectTwo"));
      return;
    }
    const res = await fetch(
      `/api/versions/compare?a=${encodeURIComponent(selected[0]!)}&b=${encodeURIComponent(selected[1]!)}`
    );
    const json = await res.json();
    if (!json.success) {
      appToast.error(json.message || t("versionsUi.compareFailed"));
      return;
    }
    setCompareDiffs(json.data.diffs);
    setCompareLabels({
      left: `v${json.data.left.versionNumber}`,
      right: `v${json.data.right.versionNumber}`,
    });
  }

  async function exportHistory(format: "csv" | "excel") {
    const res = await fetch(`/api/versions/export?${queryString}`);
    const json = await res.json();
    if (!json.success) {
      appToast.error(json.message || "هەناردەکردن سەرنەکەوت");
      return;
    }
    const rows = json.data.rows as Record<string, string | number | null>[];
    if (format === "csv") exportToCsv("version-history.csv", rows);
    else await exportToExcel("version-history.xlsx", "وەشانەکان", rows);
    appToast.success("هەناردە کرا");
  }

  async function copyLink(id: string) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${versionPageHref(id)}`
      );
      appToast.success("بەستەر کۆپی کرا");
    } catch {
      appToast.error("کۆپیکردن سەرنەکەوت");
    }
  }

  async function confirmRestore() {
    if (!restoreId) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/versions/${restoreId}/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.success) {
        appToast.error(json.message || "گەڕاندنەوە سەرنەکەوت");
        return;
      }
      appToast.success("وەشان گەڕێندرایەوە");
      setRestoreId(null);
      router.refresh();
      await load();
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-black text-primary">
            <History aria-hidden />
            {t("versionsUi.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("versionsUi.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void runCompare()}
            disabled={selected.length !== 2}
          >
            <GitCompare size={16} aria-hidden />
            {t("versionsUi.compare")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void exportHistory("csv")}
          >
            <Download size={16} aria-hidden />
            CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void exportHistory("excel")}
          >
            <Download size={16} aria-hidden />
            Excel
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-xs)] lg:flex-row lg:flex-wrap lg:items-end">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">{t("common.search")}</span>
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder={t("versionsUi.searchPlaceholder")}
            className="h-11 w-full rounded-2xl border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
          />
        </label>
        <label className="text-xs font-bold">
          {t("versionsUi.type")}
          <select
            value={entityType}
            onChange={(e) => {
              setPage(1);
              setEntityType(e.target.value);
            }}
            className="mt-1 block h-11 min-w-[140px] rounded-2xl border border-border bg-background px-3 text-sm"
          >
            <option value="">{t("common.all")}</option>
            {filters.entityTypes.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          {t("activity.action")}
          <select
            value={action}
            onChange={(e) => {
              setPage(1);
              setAction(e.target.value);
            }}
            className="mt-1 block h-11 min-w-[140px] rounded-2xl border border-border bg-background px-3 text-sm"
          >
            <option value="">{t("common.all")}</option>
            {Object.keys(VERSION_ACTION_LABELS).map((a) => (
              <option key={a} value={a}>
                {VERSION_ACTION_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          {t("versionsUi.user")}
          <select
            value={userId}
            onChange={(e) => {
              setPage(1);
              setUserId(e.target.value);
            }}
            className="mt-1 block h-11 min-w-[160px] rounded-2xl border border-border bg-background px-3 text-sm"
          >
            <option value="">{t("common.all")}</option>
            {filters.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          {t("versionsUi.sort")}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="mt-1 block h-11 min-w-[140px] rounded-2xl border border-border bg-background px-3 text-sm"
          >
            <option value="newest">{t("versionsUi.newest")}</option>
            <option value="oldest">{t("versionsUi.oldest")}</option>
            <option value="version_desc">{t("versionsUi.versionDesc")}</option>
            <option value="version_asc">{t("versionsUi.versionAsc")}</option>
          </select>
        </label>
        {entityId ? (
          <button
            type="button"
            className="h-11 rounded-2xl border border-border px-3 text-xs font-bold hover:bg-muted"
            onClick={() => {
              setEntityId("");
              setPage(1);
            }}
          >
            {t("versionsUi.clearEntityFilter")}
          </button>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {loading ? t("common.loading") : t("versionsUi.versionsCount", { count: total })}
      </p>

      <div className="rek-table-shell">
        <div className="rek-table-wrap max-h-[min(70vh,720px)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
              <tr className="text-right">
                <th className="px-3 py-3 font-bold" scope="col">
                  <span className="sr-only">{t("versionsUi.select")}</span>
                </th>
                <th className="px-3 py-3 font-bold" scope="col">
                  {t("versionsUi.ver")}
                </th>
                <th className="px-3 py-3 font-bold" scope="col">
                  {t("versionsUi.record")}
                </th>
                <th className="px-3 py-3 font-bold" scope="col">
                  {t("versionsUi.type")}
                </th>
                <th className="px-3 py-3 font-bold" scope="col">
                  {t("activity.action")}
                </th>
                <th className="px-3 py-3 font-bold" scope="col">
                  {t("versionsUi.user")}
                </th>
                <th className="px-3 py-3 font-bold" scope="col">
                  {t("versionsUi.when")}
                </th>
                <th className="px-3 py-3 font-bold" scope="col">
                  {t("versionsUi.fields")}
                </th>
                <th className="px-3 py-3 text-center font-bold" scope="col">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-16 text-center text-muted-foreground"
                  >
                    {t("versionsUi.noVersions")}
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-t border-border/70 transition hover:bg-muted/40",
                      selected.includes(row.id) && "bg-primary/5"
                    )}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        aria-label={t("versionsUi.select") + ` v${row.versionNumber}`}
                      />
                    </td>
                    <td className="px-3 py-3 font-black tabular-nums">
                      v{row.versionNumber}
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      {row.href ? (
                        <Link
                          href={row.href}
                          className="hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/35"
                        >
                          {row.recordName}
                        </Link>
                      ) : (
                        row.recordName
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {row.entityType}
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      {VERSION_ACTION_LABELS[row.action] || row.action}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {row.userName || "—"}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-muted-foreground">
                      {row.date} {row.time}
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-3 text-muted-foreground">
                      {row.changedFields.map((f) => f.field).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
                          aria-label={t("versionsUi.viewVersion")}
                          onClick={() => setViewRow(row)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
                          aria-label={t("versionsUi.copyLink")}
                          onClick={() => void copyLink(row.id)}
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-primary hover:bg-primary/10 focus-visible:ring-[3px] focus-visible:ring-ring/35"
                          aria-label="گەڕاندنەوەی وەشان"
                          onClick={() => setRestoreId(row.id)}
                        >
                          <RotateCcw size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {t("versionsUi.pageOf", { page, total: totalPages })}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("common.previous")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("common.next")}
          </Button>
        </div>
      </div>

      {compareDiffs ? (
        <div className="space-y-2">
          <h2 className="text-lg font-black">{t("versionsUi.sideBySide")}</h2>
          <VersionCompare
            leftLabel={compareLabels.left}
            rightLabel={compareLabels.right}
            diffs={compareDiffs}
          />
        </div>
      ) : null}

      {viewRow ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("versionsUi.ver") + ` ${viewRow.versionNumber}`}
          className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-md)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-black">
                v{viewRow.versionNumber} · {viewRow.recordName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {VERSION_ACTION_LABELS[viewRow.action] || viewRow.action} ·{" "}
                {viewRow.userName || "سیستەم"} · {viewRow.date} {viewRow.time}
              </p>
              {viewRow.comment ? (
                <p className="mt-2 text-sm">{viewRow.comment}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewRow(null)}
            >{t("common.close")}</Button>
          </div>
          <VersionCompare
            leftLabel="پێش"
            rightLabel="دوای"
            diffs={viewRow.changedFields.map((f) => ({
              field: f.field,
              before: f.before,
              after: f.after,
              kind:
                f.before === undefined || f.before === null
                  ? "added"
                  : f.after === undefined || f.after === null
                    ? "removed"
                    : "modified",
            }))}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(restoreId)}
        title="ئەم وەشانە بگەڕێنرێتەوە؟"
        description={t("versionsUi.restoreDesc")}
        confirmText="گەڕاندنەوە"
        cancelText="هەڵوەشاندنەوە"
        loading={restoring}
        onCancel={() => setRestoreId(null)}
        onConfirm={() => void confirmRestore()}
      />
    </div>
  );
}
