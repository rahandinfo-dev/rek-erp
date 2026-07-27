"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Package, Pin } from "lucide-react";
import { useT } from "@/components/i18n/LocaleProvider";
import { useNavigationHistory } from "@/lib/history/provider";
import {
  HISTORY_FILTER_MODULES,
  HISTORY_MODULE_LABELS,
  groupHistoryItems,
  relativeOpened,
  type HistoryItem,
  type HistoryModuleKey,
} from "@/lib/history/types";
import HistoryItemActions, {
  HistoryActionBadge,
} from "@/components/history/HistoryItemActions";

function HistoryRow({
  item,
  collapsed,
}: {
  item: HistoryItem;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <Link
        href={item.href}
        title={`${item.title} · ${item.subtitle || ""}`}
        className="rek-nav-item justify-center px-0"
      >
        {item.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail}
            alt=""
            className="size-5 rounded object-cover"
          />
        ) : (
          <Package size={16} aria-hidden />
        )}
      </Link>
    );
  }

  return (
    <div className="group relative">
      <Link
        href={item.href}
        className="rek-nav-item !items-start gap-2 py-2 pe-8"
        title={item.title}
      >
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {item.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <Package size={14} className="text-muted-foreground" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[12px] font-bold text-foreground">
              {item.title}
            </span>
            {item.pinned ? (
              <Pin size={10} className="shrink-0 text-primary" aria-hidden />
            ) : null}
            <HistoryActionBadge action={item.action} />
          </span>
          <span className="block truncate text-[10px] text-muted-foreground">
            {item.subtitle || HISTORY_MODULE_LABELS[item.moduleKey]} ·{" "}
            {relativeOpened(item.openedAt)}
          </span>
        </span>
      </Link>

      <div className="absolute top-1 left-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <HistoryItemActions item={item} />
      </div>
    </div>
  );
}

export default function RecentHistorySidebar({
  collapsed,
}: {
  collapsed: boolean;
}) {
  const { t } = useT();
  const { items } = useNavigationHistory();
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<HistoryModuleKey | "all">(
    "all"
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (moduleFilter !== "all" && i.moduleKey !== moduleFilter) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        (i.subtitle || "").toLowerCase().includes(q) ||
        i.moduleKey.toLowerCase().includes(q) ||
        i.href.toLowerCase().includes(q)
      );
    });
  }, [items, query, moduleFilter]);

  const groups = useMemo(() => groupHistoryItems(filtered), [filtered]);

  if (collapsed) {
    const top = items.slice(0, 6);
    if (!top.length) return null;
    return (
      <div>
        <ul className="space-y-0.5">
          {top.map((item) => (
            <li key={item.href}>
              <HistoryRow item={item} collapsed />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between px-3">
        <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
          {t("history.recent")}
        </p>
        <Link
          href="/dashboard/recent"
          className="text-[10px] font-bold text-primary hover:underline"
        >
          {t("history.viewAll")}
        </Link>
      </div>

      <div className="mb-2 space-y-1.5 px-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="گەڕان لە مێژوو…"
          aria-label={t("history.searchAria")}
          className="h-8 w-full rounded-xl border border-transparent bg-muted/70 px-2.5 text-xs outline-none focus:border-primary/40 focus:bg-card"
        />
        <select
          value={moduleFilter}
          onChange={(e) =>
            setModuleFilter(e.target.value as HistoryModuleKey | "all")
          }
          aria-label={t("history.filterModule")}
          className="h-8 w-full rounded-xl border border-transparent bg-muted/70 px-2 text-[11px] font-semibold outline-none focus:border-primary/40 focus:bg-card"
        >
          <option value="all">{t("history.allModules")}</option>
          {HISTORY_FILTER_MODULES.map((m) => (
            <option key={m} value={m}>
              {HISTORY_MODULE_LABELS[m]}
            </option>
          ))}
        </select>
      </div>

      {groups.length === 0 ? (
        <p className="px-3 py-3 text-[11px] text-muted-foreground">
          {t("history.emptySidebar")}
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id}>
              <p className="mb-1 px-3 text-[10px] font-bold text-muted-foreground">
                {g.label}
              </p>
              <ul className="space-y-0.5">
                {g.items.slice(0, g.id === "older" ? 8 : 20).map((item) => (
                  <li key={item.href}>
                    <HistoryRow item={item} collapsed={false} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
