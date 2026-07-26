"use client";
import { formatDateTime } from "@/lib/utils/datetime";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Download,
  Eye,
  Link2,
  MoreHorizontal,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import type { RecycleBinItem } from "@/lib/recycle/types";
import { MODULE_LABELS, RECYCLE_MODULES, RETENTION_OPTIONS } from "@/lib/recycle/types";
import { relativeTime } from "@/lib/drafts/centerMeta";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type SortKey = "newest" | "oldest" | "expires" | "name" | "module";

export default function RecycleBin() {
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [details, setDetails] = useState<RecycleBinItem | null>(null);
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [purgeId, setPurgeId] = useState<string | null>(null);
  const [purgeConfirm2, setPurgeConfirm2] = useState(false);
  const [bulkAction, setBulkAction] = useState<"restore" | "purge" | "empty" | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const sp = new URLSearchParams({
          page: String(pageNum),
          pageSize: "30",
          sort,
          status: "deleted",
          related: "1",
        });
        if (query.trim()) sp.set("q", query.trim());
        if (module !== "all") sp.set("module", module);
        const res = await fetch(`/api/recycle-bin?${sp}`, { cache: "no-store" });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "سەرنەکەوت");
        const next: RecycleBinItem[] = json.data.items || [];
        setItems((prev) => (append ? [...prev, ...next] : next));
        setTotal(json.data.total || 0);
        setHasMore(Boolean(json.data.hasMore));
        if (json.data.retentionDays) setRetentionDays(json.data.retentionDays);
        setPage(pageNum);
      } catch {
        appToast.error("نەتوانرا سەبەتەی زبڵ بار بکرێت.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [module, query, sort]
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load(1, false);
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading && !loadingMore) {
          window.setTimeout(() => {
            void load(page + 1, true);
          }, 0);
        }
      },
      { rootMargin: "240px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, load, loading, loadingMore, page]);

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const doRestore = async (ids: string[]) => {
    setBusy(true);
    try {
      const res = await fetch("/api/recycle-bin/restore", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (!json.success) {
        appToast.error(json.message || "گەڕاندنەوە سەرنەکەوت");
        return;
      }
      appToast.success("بە سەرکەوتوویی گەڕێندرایەوە");
      setSelected(new Set());
      await load(1, false);
    } catch {
      appToast.error("گەڕاندنەوە سەرنەکەوت");
    } finally {
      setBusy(false);
      setRestoreId(null);
      setBulkAction(null);
    }
  };

  const doPurge = async (ids: string[]) => {
    setBusy(true);
    try {
      const res = await fetch("/api/recycle-bin/purge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids, confirm: true }),
      });
      const json = await res.json();
      if (!json.success) {
        appToast.error(json.message || "سڕینەوەی هەمیشەیی سەرنەکەوت");
        return;
      }
      appToast.success("بە هەمیشەیی سڕایەوە");
      setSelected(new Set());
      await load(1, false);
    } catch {
      appToast.error("سڕینەوەی هەمیشەیی سەرنەکەوت");
    } finally {
      setBusy(false);
      setPurgeId(null);
      setPurgeConfirm2(false);
      setBulkAction(null);
    }
  };

  const doEmpty = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/recycle-bin/empty", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: true, confirmPhrase: "EMPTY" }),
      });
      const json = await res.json();
      if (!json.success) {
        appToast.error(json.message || "بەتاڵکردنەوە سەرنەکەوت");
        return;
      }
      appToast.success(
        `Emptied · ${json.data?.purged || 0} purged, ${json.data?.skipped || 0} skipped`
      );
      setSelected(new Set());
      await load(1, false);
    } catch {
      appToast.error("بەتاڵکردنەوە سەرنەکەوت");
    } finally {
      setBusy(false);
      setBulkAction(null);
    }
  };

  const saveRetention = async (days: number) => {
    try {
      const res = await fetch("/api/recycle-bin/prefs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ retentionDays: days }),
      });
      const json = await res.json();
      if (!json.success) {
        appToast.error(json.message || "نەتوانرا ماوەی پاراستن پاشەکەوت بکرێت");
        return;
      }
      setRetentionDays(days);
      appToast.success(`Retention set to ${days} days`);
      await load(1, false);
    } catch {
      appToast.error("نەتوانرا ماوەی پاراستن پاشەکەوت بکرێت");
    }
  };

  const copyLink = async (item: RecycleBinItem) => {
    const href =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard/recycle-bin?id=${item.id}`
        : `/dashboard/recycle-bin?id=${item.id}`;
    try {
      await navigator.clipboard.writeText(href);
      appToast.success("بەستەر کۆپی کرا");
    } catch {
      appToast.error("کۆپیکردن سەرنەکەوت");
    }
  };

  const exportCsv = () => {
    const rows = [
      [
        "ناو",
        "مۆدیوول",
        "سڕاوە لەلایەن",
        "سڕاوە لە",
        "هۆکار",
        "ڕۆژە ماوەکان",
        "دۆخ",
      ],
      ...items.map((i) => [
        i.name,
        i.moduleLabel,
        i.deletedBy || "",
        new Date(i.deletedAt).toISOString(),
        i.reason || "",
        String(i.daysRemaining),
        i.status,
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recycle-bin-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restoreTarget = useMemo(
    () => items.find((i) => i.id === restoreId) || null,
    [items, restoreId]
  );
  const purgeTarget = useMemo(
    () => items.find((i) => i.id === purgeId) || null,
    [items, purgeId]
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">سەبەتەی زبڵ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            تۆمارە سڕاوەکان · گەڕاندنەوە بۆ ماوەی {retentionDays} ڕۆژ · {total}{" "}
            items
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            Retention
            <select
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
              value={retentionDays}
              onChange={(e) => void saveRetention(Number(e.target.value))}
              aria-label="ماوەی پاراستن بە ڕۆژ"
            >
              {RETENTION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
          >
            <Download size={16} aria-hidden />
            Export
          </button>
          <button
            type="button"
            onClick={() => setBulkAction("empty")}
            className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive/10 focus-visible:ring-[3px] focus-visible:ring-ring/35"
          >
            <Trash2 size={16} aria-hidden />
            Empty Bin
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="گەڕان بە ناو، مۆدیوول، هۆکار، سڕاو لەلایەن…"
            className="w-full rounded-2xl border border-border bg-background py-2.5 ps-10 pe-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
            aria-label="گەڕان لە سەبەتەی زبڵ"
          />
        </div>
        <select
          value={module}
          onChange={(e) => setModule(e.target.value)}
          className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm font-bold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
          aria-label="فلتەر بەپێی مۆدیوول"
        >
          <option value="all">هەموو مۆدیوولەکان</option>
          {RECYCLE_MODULES.map((m) => (
            <option key={m} value={m}>
              {MODULE_LABELS[m] || m}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm font-bold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
          aria-label="ڕیزکردنی سەبەتەی زبڵ"
        >
          <option value="newest">نوێترین سڕاوەکان</option>
          <option value="oldest">کۆنترین سڕاوەکان</option>
          <option value="expires">بەم زووانە بەسەردەچێت</option>
          <option value="name">ناو</option>
          <option value="module">مۆدیوول</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3"
          role="toolbar"
          aria-label="کردارە کۆمەڵایەتییەکان"
        >
          <span className="text-sm font-bold"{selected.size} هەڵبژێردراو</span>
          <button
            type="button"
            className="rounded-xl bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
            onClick={() => setBulkAction("restore")}
          >
            Restore Selected
          </button>
          <button
            type="button"
            className="rounded-xl border border-destructive/40 px-3 py-1.5 text-sm font-bold text-destructive focus-visible:ring-[3px] focus-visible:ring-ring/35"
            onClick={() => setBulkAction("purge")}
          >
            Delete Permanently
          </button>
        </div>
      )}

      <section
        className="rek-card overflow-hidden p-0"
        aria-label="تۆمارە سڕاوەکان"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-start text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs font-black uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="هەڵبژاردنی هەموو"
                  />
                </th>
                <th className="px-4 py-3 text-start">ناو</th>
                <th className="px-4 py-3 text-start">مۆدیوول</th>
                <th className="px-4 py-3 text-start">سڕاوە لەلایەن</th>
                <th className="px-4 py-3 text-start">سڕاوە لە</th>
                <th className="px-4 py-3 text-start">هۆکار</th>
                <th className="px-4 py-3 text-start">ڕۆژی ماوە</th>
                <th className="px-4 py-3 text-start">دۆخ</th>
                <th className="px-4 py-3 text-end">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Recycle Bin is empty.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleOne(item.id)}
                        aria-label={`Select ${item.name}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.moduleLabel}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.deletedBy || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {relativeTime(item.deletedAt)}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-muted-foreground">
                      {item.reason || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-lg px-2 py-1 text-xs font-bold",
                          item.daysRemaining <= 7
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {item.daysRemaining}d
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {item.status}
                    </td>
                    <td className="relative px-4 py-3 text-end">
                      <button
                        type="button"
                        className="rounded-lg p-2 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35"
                        aria-label={`Actions for ${item.name}`}
                        aria-haspopup="menu"
                        aria-expanded={menuFor === item.id}
                        onClick={() =>
                          setMenuFor((v) => (v === item.id ? null : item.id))
                        }
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {menuFor === item.id && (
                        <div
                          role="menu"
                          className="absolute end-4 z-20 mt-1 w-48 rounded-xl border border-border bg-card p-1 shadow-lg"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm font-bold hover:bg-muted"
                            onClick={() => {
                              setMenuFor(null);
                              setRestoreId(item.id);
                            }}
                          >
                            <RotateCcw size={14} /> Restore
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm font-bold hover:bg-muted"
                            onClick={() => {
                              setMenuFor(null);
                              setDetails(item);
                            }}
                          >
                            <Eye size={14} /> View Details
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm font-bold hover:bg-muted"
                            onClick={() => {
                              setMenuFor(null);
                              void copyLink(item);
                            }}
                          >
                            <Copy size={14} /> Copy Link
                          </button>
                          {item.detailHref && (
                            <Link
                              href={item.detailHref}
                              role="menuitem"
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm font-bold hover:bg-muted"
                              onClick={() => setMenuFor(null)}
                            >
                              <Link2 size={14} /> Open record
                            </Link>
                          )}
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm font-bold text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setMenuFor(null);
                              setPurgeId(item.id);
                              setPurgeConfirm2(false);
                            }}
                          >
                            <Trash2 size={14} /> Permanent Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div ref={sentinelRef} className="px-4 py-4 text-center text-xs text-muted-foreground">
          {loadingMore
            ? "زیاتر باردەکرێت…"
            : hasMore
              ? "بۆ زیاتر بشۆڕەوە"
              : items.length > 0
                ? "کۆتایی لیست"
                : null}
        </div>
      </section>

      {details && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rb-details-title"
          onClick={() => setDetails(null)}
        >
          <div
            className="rek-dialog w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="rb-details-title" className="text-xl font-black">
              {details.name}
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">مۆدیوول</dt>
                <dd className="font-bold">{details.moduleLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">سڕاوە لەلایەن</dt>
                <dd className="font-bold">{details.deletedBy || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">سڕاوە لە</dt>
                <dd className="font-bold">
                  {formatDateTime(details.deletedAt, true)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">ڕۆژە ماوەکان</dt>
                <dd className="font-bold">{details.daysRemaining}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">هۆکار</dt>
                <dd className="font-bold">{details.reason || "—"}</dd>
              </div>
            </dl>
            {details.related.length > 0 && (
              <div className="mt-4 rounded-xl border border-border p-3">
                <p className="text-xs font-black uppercase text-muted-foreground">
                  Related data
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {details.related.map((r) => (
                    <li key={r.label} className="flex justify-between">
                      <span>{r.label}</span>
                      <span className="font-bold">{r.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-border px-4 py-2 text-sm font-bold focus-visible:ring-[3px] focus-visible:ring-ring/35"
                onClick={() => setDetails(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
                onClick={() => {
                  setDetails(null);
                  setRestoreId(details.id);
                }}
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(restoreId)}
        title="تۆمارەکە بگەڕێنرێتەوە؟"
        description={
          restoreTarget
            ? `Restore “${restoreTarget.name}” (${restoreTarget.moduleLabel}). Related links will be recovered safely where supported.`
            : "ئەم تۆمارە بگەڕێنرێتەوە؟"
        }
        confirmText="گەڕاندنەوە"
        cancelText="هەڵوەشاندنەوە"
        loading={busy}
        onConfirm={() => restoreId && void doRestore([restoreId])}
        onCancel={() => setRestoreId(null)}
      />

      <ConfirmDialog
        open={Boolean(purgeId) && !purgeConfirm2}
        title="سڕینەوەی هەمیشەیی؟"
        description={
          purgeTarget
            ? `This will permanently remove “${purgeTarget.name}”.${
                purgeTarget.related.length
                  ? ` Related: ${purgeTarget.related
                      .map((r) => `${r.label} (${r.count})`)
                      .join(", ")}.`
                  : ""
              } This cannot be undone.`
            : "ئەم کردارە ناگەڕێتەوە."
        }
        confirmText="بەردەوامبوون"
        cancelText="هەڵوەشاندنەوە"
        loading={busy}
        onConfirm={() => setPurgeConfirm2(true)}
        onCancel={() => {
          setPurgeId(null);
          setPurgeConfirm2(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(purgeId) && purgeConfirm2}
        title="پشتڕاستکردنەوەی سڕینەوەی هەمیشەیی"
        description="Type-level confirmation: permanently delete this record from the database?"
        confirmText="سڕینەوەی هەمیشەیی"
        cancelText="هەڵوەشاندنەوە"
        loading={busy}
        onConfirm={() => purgeId && void doPurge([purgeId])}
        onCancel={() => {
          setPurgeId(null);
          setPurgeConfirm2(false);
        }}
      />

      <ConfirmDialog
        open={bulkAction === "restore"}
        title="هەڵبژێردراوەکان بگەڕێنرێنەوە؟"
        description={`Restore ${selected.size} record(s) from the Recycle Bin.`}
        confirmText="گەڕاندنەوەی هەڵبژێردراوەکان"
        cancelText="هەڵوەشاندنەوە"
        loading={busy}
        onConfirm={() => void doRestore([...selected])}
        onCancel={() => setBulkAction(null)}
      />

      <ConfirmDialog
        open={bulkAction === "purge"}
        title="هەڵبژێردراوەکان بە هەمیشەیی بسڕدرێنەوە؟"
        description={`Permanently delete ${selected.size} record(s). Blocked items with related history will be skipped. This cannot be undone.`}
        confirmText="سڕینەوەی هەمیشەیی"
        cancelText="هەڵوەشاندنەوە"
        loading={busy}
        onConfirm={() => void doPurge([...selected])}
        onCancel={() => setBulkAction(null)}
      />

      <ConfirmDialog
        open={bulkAction === "empty"}
        title="سەبەتەی زبڵ بەتاڵ بکرێتەوە؟"
        description="Permanently delete all eligible items. Records with related history will be kept. This cannot be undone."
        confirmText="Empty Bin"
        cancelText="هەڵوەشاندنەوە"
        loading={busy}
        onConfirm={() => void doEmpty()}
        onCancel={() => setBulkAction(null)}
      />
    </div>
  );
}
