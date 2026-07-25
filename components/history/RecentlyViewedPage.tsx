"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Package, Pin } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import HistoryItemActions, {
  HistoryActionBadge,
} from "@/components/history/HistoryItemActions";
import { useNavigationHistory } from "@/lib/history/provider";
import {
  HISTORY_FILTER_MODULES,
  HISTORY_MODULE_LABELS,
  computeHistoryInsights,
  groupHistoryItems,
  relativeOpened,
  type HistoryAction,
  type HistoryItem,
  type HistoryModuleKey,
} from "@/lib/history/types";

const PAGE_SIZE = 20;

function parseActionParam(v: string | null): HistoryAction | "all" {
  if (
    v === "edited" ||
    v === "created" ||
    v === "viewed" ||
    v === "printed" ||
    v === "downloaded"
  ) {
    return v;
  }
  return "all";
}

function parseModuleParam(v: string | null): HistoryModuleKey | "all" {
  if (v && HISTORY_FILTER_MODULES.includes(v as HistoryModuleKey)) {
    return v as HistoryModuleKey;
  }
  return "all";
}

export default function RecentlyViewedPage() {
  const searchParams = useSearchParams();
  const { items, refresh } = useNavigationHistory();
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<HistoryModuleKey | "all">(
    () => parseModuleParam(searchParams.get("module"))
  );
  const [actionFilter, setActionFilter] = useState<HistoryAction | "all">(() =>
    parseActionParam(searchParams.get("action"))
  );
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (moduleFilter !== "all" && i.moduleKey !== moduleFilter) return false;
      if (actionFilter !== "all" && i.action !== actionFilter) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        (i.subtitle || "").toLowerCase().includes(q) ||
        i.moduleKey.toLowerCase().includes(q) ||
        i.href.toLowerCase().includes(q)
      );
    });
  }, [items, query, moduleFilter, actionFilter]);

  const groups = useMemo(
    () => groupHistoryItems(filtered.slice(0, visible)),
    [filtered, visible]
  );
  const insights = useMemo(() => computeHistoryInsights(items), [items]);
  const hasMore = visible < filtered.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recently Viewed"
        description="Continue where you left off — search, filter, and pin anything."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Recently Viewed" },
        ]}
      />

      {insights.length ? (
        <section
          aria-label="Insights"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
        >
          {insights.map((ins) => (
            <Link
              key={ins.moduleKey}
              href={ins.href}
              className="rek-card block p-4 transition hover:border-primary/40"
            >
              <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                {ins.label}
              </p>
              <p className="mt-1 truncate text-sm font-black text-foreground">
                {ins.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {ins.count} open{ins.count === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </section>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(PAGE_SIZE);
          }}
          placeholder="Search history… (e.g. cement)"
          className="h-11 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
        />
        <select
          value={moduleFilter}
          onChange={(e) => {
            setModuleFilter(e.target.value as HistoryModuleKey | "all");
            setVisible(PAGE_SIZE);
          }}
          className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-semibold"
          aria-label="Filter by module"
        >
          <option value="all">All modules</option>
          {HISTORY_FILTER_MODULES.map((m) => (
            <option key={m} value={m}>
              {HISTORY_MODULE_LABELS[m]}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value as HistoryAction | "all");
            setVisible(PAGE_SIZE);
          }}
          className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-semibold"
          aria-label="Filter by action"
        >
          <option value="all">All activity</option>
          <option value="viewed">Viewed</option>
          <option value="edited">Edited</option>
          <option value="created">Created</option>
          <option value="printed">Printed</option>
          <option value="downloaded">Downloaded</option>
        </select>
      </div>

      {groups.length === 0 ? (
        <p className="rek-card px-5 py-12 text-center text-sm text-muted-foreground">
          No matching history. Open a record and it will appear here
          automatically.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.id} className="rek-card overflow-hidden p-0">
              <h2 className="border-b border-border px-5 py-3 text-sm font-black">
                {g.label}
              </h2>
              <ul className="divide-y divide-border">
                {g.items.map((item) => (
                  <HistoryRow key={item.href} item={item} />
                ))}
              </ul>
            </section>
          ))}

          {hasMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                className="h-11 rounded-xl border border-border bg-card px-6 text-sm font-bold hover:bg-muted"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Load more ({filtered.length - visible} left)
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/40 sm:px-5">
      <Link href={item.href} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
          {item.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <Package size={16} className="text-muted-foreground" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-bold text-foreground">
              {item.title}
            </span>
            {item.pinned ? (
              <Pin size={12} className="text-primary" aria-hidden />
            ) : null}
            <HistoryActionBadge action={item.action} />
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {item.subtitle ||
              HISTORY_MODULE_LABELS[item.moduleKey] ||
              item.moduleKey}{" "}
            · {relativeOpened(item.openedAt)}
          </span>
        </span>
      </Link>
      <HistoryItemActions item={item} />
    </li>
  );
}
