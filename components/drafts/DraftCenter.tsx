"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  Download,
  Eye,
  Link2,
  MoreHorizontal,
  Pin,
  Play,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {
  listLocalDrafts,
  fetchDraftList,
  clearDraft,
  writeDraft,
} from "@/lib/drafts/storage";
import { useDraftOwner } from "@/lib/drafts/owner";
import {
  moduleLabel,
  relativeTime,
  resumeHrefForKey,
  type DraftListItem,
} from "@/lib/drafts/centerMeta";
import { postDraftAudit } from "@/lib/drafts/audit";
import { useSessionRecovery } from "@/lib/recovery/provider";
import { MODULE_LABELS } from "@/lib/recovery/types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ConnectionStatusBadge from "@/components/recovery/ConnectionStatus";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useSaveGuard } from "@/lib/unsaved/provider";
import { useT } from "@/components/i18n/LocaleProvider";

type SortKey = "newest" | "oldest" | "modified" | "progress" | "module";
type FilterKey =
  | "all"
  | "products"
  | "sales"
  | "purchases"
  | "invoices"
  | "customers"
  | "suppliers"
  | "reports"
  | "completed"
  | "recovered"
  | "archived"
  | "failed";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "هەموو" },
  { key: "products", label: "بەرهەمەکان" },
  { key: "sales", label: "فرۆشتن" },
  { key: "purchases", label: "کڕین" },
  { key: "invoices", label: "پسوولەکان" },
  { key: "customers", label: "کڕیارەکان" },
  { key: "suppliers", label: "دابینکەران" },
  { key: "reports", label: "ڕاپۆرتەکان" },
  { key: "completed", label: "تەواوکراو" },
  { key: "recovered", label: "گەڕێندراوەتەوە" },
  { key: "archived", label: "ئەرشیفکراو" },
  { key: "failed", label: "سەرنەکەوت" },
];

function mergeDrafts(
  local: DraftListItem[],
  remote: DraftListItem[]
): DraftListItem[] {
  const map = new Map<string, DraftListItem>();
  for (const d of local) map.set(d.key, d);
  for (const d of remote) {
    const prev = map.get(d.key);
    if (!prev || d.savedAt >= prev.savedAt) map.set(d.key, d);
  }
  return [...map.values()];
}

export default function DraftCenter() {
  const { t } = useT();
  const router = useRouter();
  const { userId, companyId } = useDraftOwner();
  const { connection, sessions, restoreSession } = useSessionRecovery();
  const saveGuard = useSaveGuard();
  const [drafts, setDrafts] = useState<DraftListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("modified");
  const [preview, setPreview] = useState<DraftListItem | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [versionsFor, setVersionsFor] = useState<string | null>(null);
  const [versions, setVersions] = useState<
    Array<{
      id: string;
      version: number;
      label: string;
      createdAt: number;
      progress: number;
      payload: unknown;
    }>
  >([]);
  const [compare, setCompare] = useState<{
    a: unknown;
    b: unknown;
  } | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    recovered: number;
    completed: number;
    archived: number;
    failed: number;
  } | null>(null);
  const [visible, setVisible] = useState(40);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const local = listLocalDrafts(userId).map((d) => ({
      ...d,
      resumeHref: d.resumeHref || resumeHrefForKey(d.key),
      moduleLabel: d.moduleLabel || moduleLabel(d.moduleKey),
    }));
    const remote = navigator.onLine
      ? await fetchDraftList({
          includeArchived: filter === "archived",
        })
      : [];
    setDrafts(mergeDrafts(local, remote));
    if (navigator.onLine) {
      try {
        const res = await fetch("/api/drafts/stats", { cache: "no-store" });
        const json = await res.json();
        if (json.success) setStats(json.data);
      } catch {
        /* ignore */
      }
    }
    setLoading(false);
  }, [userId, filter]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  const sessionItems: DraftListItem[] = useMemo(
    () =>
      sessions
        .filter((s) => s.summary.draftStatus !== "empty")
        .map((s) => ({
          key: `session:${s.moduleKey}`,
          title: s.title || MODULE_LABELS[s.moduleKey] || s.moduleKey,
          moduleKey: s.moduleKey,
          moduleLabel: MODULE_LABELS[s.moduleKey] || s.moduleKey,
          status: "recovered" as const,
          pinned: false,
          archived: false,
          progress: Math.min(
            95,
            Math.round(
              (s.summary.fieldsChanged /
                Math.max(4, s.summary.fieldsChanged + 2)) *
                100
            )
          ),
          device: null,
          tags: ["session"],
          createdAt: s.createdAt,
          savedAt: s.lastSavedAt,
          updatedAt: s.lastEditedAt,
          resumeHref: s.pathname || "/dashboard",
          modifiedFields: [],
          source: "session" as const,
        })),
    [sessions]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...drafts, ...sessionItems];

    list = list.filter((d) => {
      if (filter === "archived") return d.archived || d.status === "archived";
      if (filter === "completed") return d.status === "completed";
      if (filter === "recovered") return d.status === "recovered";
      if (filter === "failed") return d.status === "failed";
      if (filter !== "all") return d.moduleKey === filter && !d.archived;
      return !d.archived;
    });

    if (q) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.moduleKey.toLowerCase().includes(q) ||
          d.status.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)) ||
          d.key.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      switch (sort) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "oldest":
          return a.createdAt - b.createdAt;
        case "progress":
          return b.progress - a.progress;
        case "module":
          return a.moduleLabel.localeCompare(b.moduleLabel);
        case "modified":
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

    return list;
  }, [drafts, sessionItems, query, filter, sort]);

  const shown = filtered.slice(0, visible);

  async function patchDraft(
    key: string,
    action: string,
    extra?: Record<string, unknown>
  ) {
    if (key.startsWith("session:")) {
      appToast.info(t("drafts.useResume"));
      return;
    }
    try {
      const res = await fetch("/api/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        appToast.error(json.message || "کردار سەرنەکەوت");
        return;
      }
      if (action === "share" && json.data?.shareUrl) {
        await navigator.clipboard?.writeText(
          `${window.location.origin}${json.data.shareUrl}`
        );
        appToast.success("بەستەر کۆپی کرا");
      } else if (action === "duplicate") {
        appToast.success(t("drafts.duplicated"));
      } else {
        appToast.success(t("drafts.updated"));
      }
      void refresh();
    } catch {
      // offline local pin/archive
      if (!userId) return;
      const local = listLocalDrafts(userId).find((d) => d.key === key);
      if (!local) return;
      const full = await import("@/lib/drafts/storage").then((m) =>
        m.readDraft(userId, key)
      );
      if (!full) return;
      writeDraft(userId, companyId, key, full.data, {
        ...full.meta,
        pinned: action === "pin" ? true : action === "unpin" ? false : full.meta?.pinned,
        archived: action === "archive" ? true : action === "restore" ? false : full.meta?.archived,
        status:
          action === "archive"
            ? "archived"
            : action === "restore"
              ? "recovered"
              : full.meta?.status,
        title: (extra?.title as string) || full.meta?.title,
      });
      appToast.success(t("drafts.updatedOffline"));
      void refresh();
    }
  }

  function resume(item: DraftListItem) {
    if (item.source === "session") {
      const mod = item.key.replace("session:", "");
      const sess = sessions.find((s) => s.moduleKey === mod);
      if (sess) void restoreSession(sess);
      return;
    }
    router.push(item.resumeHref || resumeHrefForKey(item.key));
  }

  async function confirmDelete() {
    if (!deleteKey || !userId) return;
    clearDraft(userId, deleteKey);
    try {
      await fetch(`/api/drafts?key=${encodeURIComponent(deleteKey)}`, {
        method: "DELETE",
      });
    } catch {
      /* offline */
    }
    void postDraftAudit({ draftKey: deleteKey, action: "deleted" });
    appToast.success(t("drafts.deleted"));
    setDeleteKey(null);
    void refresh();
  }

  async function openVersions(key: string) {
    setVersionsFor(key);
    try {
      const res = await fetch(
        `/api/drafts/versions?key=${encodeURIComponent(key)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (json.success) setVersions(json.data);
      else setVersions([]);
    } catch {
      setVersions([]);
    }
  }

  function exportDrafts(format: "json" | "csv") {
    const rows = filtered.filter((d) => d.source === "form");
    if (!rows.length) {
      appToast.warning(t("drafts.noExport"));
      return;
    }
    if (format === "json") {
      const blob = new Blob([JSON.stringify(rows, null, 2)], {
        type: "application/json",
      });
      downloadBlob(blob, `drafts-${Date.now()}.json`);
    } else {
      const header = "title,module,status,progress,savedAt,device\n";
      const body = rows
        .map(
          (d) =>
            `"${d.title}","${d.moduleKey}","${d.status}",${d.progress},${new Date(d.savedAt).toISOString()},"${d.device || ""}"`
        )
        .join("\n");
      downloadBlob(
        new Blob([header + body], { type: "text/csv" }),
        `drafts-${Date.now()}.csv`
      );
    }
    appToast.success("هەناردە ئامادەیە");
  }

  async function exportExcel() {
    const rows = filtered.filter((d) => d.source === "form");
    if (!rows.length) {
      appToast.warning(t("drafts.noExport"));
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.json_to_sheet(
        rows.map((d) => ({
          Title: d.title,
          Module: d.moduleLabel,
          Status: d.status,
          Progress: d.progress,
          Device: d.device || "",
          SavedAt: new Date(d.savedAt).toISOString(),
        }))
      );
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Drafts");
      XLSX.writeFile(book, `drafts-${Date.now()}.xlsx`);
      appToast.success(t("drafts.excelReady"));
    } catch {
      appToast.error(t("drafts.excelFailed"));
    }
  }

  async function importJson(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const draftsIn = Array.isArray(parsed)
        ? parsed
        : (parsed as { drafts?: unknown[] }).drafts;
      if (!Array.isArray(draftsIn)) {
        appToast.error(t("drafts.invalidImport"));
        return;
      }
      const payload = {
        drafts: draftsIn.slice(0, 50).map((d) => {
          const o = d as Record<string, unknown>;
          return {
            key: String(o.key || `imported:${Date.now()}`),
            data: o.data ?? o,
            title: o.title ? String(o.title) : undefined,
            moduleKey: o.moduleKey ? String(o.moduleKey) : undefined,
          };
        }),
      };
      const res = await fetch("/api/drafts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        appToast.error(json.message || t("drafts.importFailed"));
        return;
      }
      appToast.success(t("drafts.imported", { count: json.data.imported }));
      void refresh();
    } catch {
      appToast.error(t("drafts.importFailed"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">
            {t("drafts.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("drafts.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConnectionStatusBadge status={connection} />
          <button
            type="button"
            onClick={() => exportDrafts("json")}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold"
          >
            <Download size={14} /> JSON
          </button>
          <button
            type="button"
            onClick={() => exportDrafts("csv")}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold"
          >
            <Download size={14} /> CSV
          </button>
          <button
            type="button"
            onClick={() => void exportExcel()}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold"
          >
            <Download size={14} /> Excel
          </button>
          <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold">
            <Upload size={14} /> {t("drafts.import")}
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importJson(f);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => router.push("/dashboard/settings")}
            className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
          >
            {t("drafts.autoSave")}:{" "}
            {saveGuard.prefs.autoSaveEnabled
              ? `${saveGuard.prefs.autoSaveDelayMs / 1000}s`
              : t("drafts.autoSaveOff")}
          </button>
        </div>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            [t("drafts.total"), stats.total],
            [t("drafts.recovered"), stats.recovered],
            [t("drafts.completed"), stats.completed],
            [t("drafts.archived"), stats.archived],
            ["سەرنەکەوت", stats.failed],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-border bg-card px-4 py-3"
            >
              <p className="text-[11px] font-bold text-muted-foreground uppercase">
                {label}
              </p>
              <p className="mt-1 text-xl font-black">{value as number}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("drafts.searchPlaceholder")}
            className="h-11 w-full rounded-2xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
            aria-label={t("drafts.searchPlaceholder")}
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-11 rounded-2xl border border-border bg-card px-3 text-xs font-bold"
          aria-label={t("drafts.sortLabel")}
        >
          <option value="modified">{t("drafts.sortModified")}</option>
          <option value="newest">{t("drafts.sortNewest")}</option>
          <option value="oldest">{t("drafts.sortOldest")}</option>
          <option value="progress">{t("drafts.sortProgress")}</option>
          <option value="module">{t("drafts.sortModule")}</option>
        </select>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-bold transition",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
          {t("drafts.loading")}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
          {t("drafts.empty")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((d) => (
            <article
              key={`${d.source}-${d.key}`}
              className="relative flex flex-col rounded-3xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-1.5 truncate text-lg font-black text-foreground">
                    {d.pinned ? (
                      <Pin size={14} className="shrink-0 text-primary" />
                    ) : null}
                    <span className="truncate">{d.title}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {d.moduleLabel} · {d.source}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {d.status}
                </span>
              </div>

              <div className="mb-3">
                <div className="mb-1 flex justify-between text-[11px] font-bold text-muted-foreground">
                  <span>{t("drafts.progress")}</span>
                  <span>{d.progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${d.progress}%` }}
                  />
                </div>
              </div>

              <dl className="mb-4 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>{t("drafts.created")}</dt>
                  <dd className="font-semibold text-foreground">
                    {relativeTime(d.createdAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{t("drafts.lastModified")}</dt>
                  <dd className="font-semibold text-foreground">
                    {relativeTime(d.updatedAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{t("drafts.autoSaved")}</dt>
                  <dd className="font-semibold text-foreground">
                    {relativeTime(d.savedAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{t("drafts.device")}</dt>
                  <dd className="font-semibold text-foreground">
                    {d.device || "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => resume(d)}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground"
                >
                  <Play size={14} /> {t("drafts.resume")}
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(d)}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-border px-3"
                  aria-label={t("drafts.preview")}
                >
                  <Eye size={14} />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setMenuFor((k) => (k === d.key ? null : d.key))
                    }
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-border px-3"
                    aria-label={t("drafts.moreActions")}
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  {menuFor === d.key ? (
                    <div className="absolute end-0 z-20 mt-1 w-44 rounded-xl border border-border bg-card p-1 shadow-lg">
                      {[
                        {
                          label: d.pinned ? "لابردنی هەڵواسین" : "هەڵواسین",
                          icon: Pin,
                          run: () =>
                            void patchDraft(d.key, d.pinned ? "unpin" : "pin"),
                        },
                        {
                          label: "ناوگۆڕین",
                          icon: Copy,
                          run: () => {
                            const title = window.prompt(t("drafts.draftName"), d.title);
                            if (title)
                              void patchDraft(d.key, "rename", { title });
                          },
                        },
                        {
                          label: "دووبارەکردنەوە",
                          icon: Copy,
                          run: () => void patchDraft(d.key, "duplicate"),
                        },
                        {
                          label: "وەشانەکان",
                          icon: Eye,
                          run: () => void openVersions(d.key),
                        },
                        {
                          label: "کۆپیکردنی بەستەر",
                          icon: Link2,
                          run: () => void patchDraft(d.key, "share"),
                        },
                        {
                          label: d.archived ? "گەڕاندنەوە" : "ئەرشیفکردن",
                          icon: Archive,
                          run: () =>
                            void patchDraft(
                              d.key,
                              d.archived ? "restore" : "archive"
                            ),
                        },
                        {
                          label: "سڕینەوە",
                          icon: Trash2,
                          run: () => setDeleteKey(d.key),
                        },
                      ].map((a) => (
                        <button
                          key={a.label}
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-xs font-bold hover:bg-muted"
                          onClick={() => {
                            setMenuFor(null);
                            a.run();
                          }}
                        >
                          <a.icon size={13} />
                          {a.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {filtered.length > visible ? (
        <div className="text-center">
          <button
            type="button"
            className="text-sm font-bold text-primary"
            onClick={() => setVisible((v) => v + 40)}
          >
            Load more drafts
          </button>
        </div>
      ) : null}

      {preview ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--overlay)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("drafts.draftPreview")}
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-lg font-black">{preview.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {preview.moduleLabel} · {preview.status} · {preview.progress}%
            </p>
            <ul className="mt-4 space-y-1 text-sm">
              {preview.modifiedFields.length ? (
                preview.modifiedFields.map((f) => (
                  <li key={f} className="text-muted-foreground">
                    ● {f}
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">{t("drafts.noFieldSummary")}</li>
              )}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Last updated {relativeTime(preview.updatedAt)}
              {preview.device ? ` · ${preview.device}` : ""}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold"
                onClick={() => setPreview(null)}
              >
                {t("common.close")}
              </button>
              <button
                type="button"
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                onClick={() => {
                  setPreview(null);
                  resume(preview);
                }}
              >
                {t("drafts.continueWorking")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {versionsFor ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--overlay)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("drafts.versionHistory")}
        >
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-black">{t("drafts.versionHistoryTitle")}</h3>
              <button
                type="button"
                className="text-xs font-bold"
                onClick={() => setVersionsFor(null)}
              >
                {t("common.close")}
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              {versions.length === 0 ? (
                <li className="p-4 text-sm text-muted-foreground">
                  {t("drafts.noVersions")}
                </li>
              ) : (
                versions.map((v, idx) => (
                  <li
                    key={v.id}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-muted/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{v.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {relativeTime(v.createdAt)} · {v.progress}%
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-[10px] font-bold text-primary"
                      onClick={() => {
                        if (versions[idx + 1]) {
                          setCompare({
                            a: v.payload,
                            b: versions[idx + 1].payload,
                          });
                        } else appToast.info(t("drafts.noOlderVersion"));
                      }}
                    >
                      {t("drafts.compare")}
                    </button>
                    <button
                      type="button"
                      className="text-[10px] font-bold text-primary"
                      onClick={async () => {
                        const res = await fetch(
                          "/api/drafts/versions?action=restore",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              key: versionsFor,
                              versionId: v.id,
                            }),
                          }
                        );
                        const json = await res.json();
                        if (json.success) {
                          appToast.success(t("versions.restoredTitle"));
                          setVersionsFor(null);
                          void refresh();
                        } else appToast.error(t("versions.restoreFailed"));
                      }}
                    >
                      {t("common.restore")}
                    </button>
                    <button
                      type="button"
                      className="text-[10px] font-bold text-destructive"
                      onClick={async () => {
                        await fetch("/api/drafts/versions?action=delete", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ versionId: v.id }),
                        });
                        void openVersions(versionsFor);
                      }}
                    >
                      {t("common.delete")}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {compare ? (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-[var(--overlay)] p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-black">{t("drafts.compareVersions")}</h3>
              <button
                type="button"
                className="text-xs font-bold"
                onClick={() => setCompare(null)}
              >
                {t("common.close")}
              </button>
            </div>
            <div className="grid max-h-[70vh] overflow-auto md:grid-cols-2">
              <pre className="overflow-auto border-b p-3 text-[11px] md:border-b-0 md:border-e">
                {JSON.stringify(compare.a, null, 2)}
              </pre>
              <pre className="overflow-auto p-3 text-[11px]">
                {JSON.stringify(compare.b, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteKey)}
        title="سڕینەوەی ڕەشنووس"
        description={t("drafts.deleteConfirm")}
        confirmText="سڕینەوە"
        cancelText="هەڵوەشاندنەوە"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteKey(null)}
      />
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
