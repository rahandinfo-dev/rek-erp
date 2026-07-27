"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb, Trash2, BarChart3 } from "lucide-react";
import type { RecycleBinItem } from "@/lib/recycle/types";
import { relativeTime } from "@/lib/drafts/centerMeta";
import { useT } from "@/components/i18n/LocaleProvider";

type Stats = {
  deleted: number;
  restored: number;
  purged: number;
  recent: number;
  expiringSoon: number;
  retentionDays: number;
  byModule: Array<{ moduleKey: string; count: number }>;
};

function useRecycleStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    let active = true;
    const id = window.setTimeout(() => {
      void fetch("/api/recycle-bin/stats", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (active && j.success) setStats(j.data);
        })
        .catch(() => undefined);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(id);
    };
  }, []);
  return stats;
}

function useRecentDeleted() {
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  useEffect(() => {
    let active = true;
    const id = window.setTimeout(() => {
      void fetch(
        "/api/recycle-bin?pageSize=6&sort=newest&status=deleted&skipSync=0",
        { cache: "no-store" }
      )
        .then((r) => r.json())
        .then((j) => {
          if (active && j.success) setItems(j.data.items || []);
        })
        .catch(() => undefined);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(id);
    };
  }, []);
  return items;
}

export function RecentlyDeletedWidget() {
  const { t } = useT();
  const items = useRecentDeleted();
  return (
    <section
      aria-label={t("recycle.recentlyDeleted")}
      className="rek-card overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Trash2 size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black text-foreground">
            {t("recycle.recentlyDeleted")}
          </h2>
        </div>
        <Link
          href="/dashboard/recycle-bin"
          className="text-xs font-bold text-primary hover:underline"
        >
          {t("recycle.recycleBin")}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          {t("recycle.noDeleted")}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((r) => (
            <li key={r.id} className="px-5 py-3">
              <p className="truncate text-sm font-bold text-foreground">
                {r.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {r.moduleLabel} · {r.deletedBy || "سیستەم"} ·{" "}
                {relativeTime(r.deletedAt)} ·{" "}
                {t("recycle.daysLeft", { count: r.daysRemaining })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RestoreSuggestionsWidget() {
  const { t } = useT();
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  useEffect(() => {
    let active = true;
    const id = window.setTimeout(() => {
      void fetch(
        "/api/recycle-bin?pageSize=6&sort=expires&status=deleted&related=1",
        { cache: "no-store" }
      )
        .then((r) => r.json())
        .then((j) => {
          if (active && j.success) {
            const list: RecycleBinItem[] = j.data.items || [];
            setItems(
              list
                .filter((i) => i.daysRemaining <= 14 || i.related.length === 0)
                .slice(0, 6)
            );
          }
        })
        .catch(() => undefined);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(id);
    };
  }, []);

  return (
    <section
      aria-label={t("recycle.restoreSuggestions")}
      className="rek-card overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Lightbulb size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black text-foreground">
            {t("recycle.restoreSuggestions")}
          </h2>
        </div>
        <Link
          href="/dashboard/recycle-bin"
          className="text-xs font-bold text-primary hover:underline"
        >
          {t("recycle.review")}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          {t("recycle.noSuggestions")}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((r) => (
            <li key={r.id} className="px-5 py-3">
              <p className="truncate text-sm font-bold text-foreground">
                {r.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {r.daysRemaining <= 7
                  ? t("recycle.expiringSoon")
                  : t("recycle.safeToRestore")}{" "}
                · {r.moduleLabel}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RecycleBinStatsWidget() {
  const { t } = useT();
  const stats = useRecycleStats();
  return (
    <section
      aria-label={t("recycle.statsTitle")}
      className="rek-card overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black text-foreground">
            {t("recycle.statsTitle")}
          </h2>
        </div>
        <Link
          href="/dashboard/recycle-bin"
          className="text-xs font-bold text-primary hover:underline"
        >
          {t("recycle.open")}
        </Link>
      </div>
      {!stats ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          {t("common.loading")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-3">
          <Stat label={t("recycle.inBin")} value={stats.deleted} />
          <Stat label={t("common.restore")} value={stats.restored} />
          <Stat label={t("recycle.purged")} value={stats.purged} />
          <Stat label={t("recycle.thisWeek")} value={stats.recent} />
          <Stat
            label={t("recycle.expiringSoonLabel")}
            value={stats.expiringSoon}
          />
          <Stat
            label={t("recycle.retention")}
            value={t("recycle.retentionDays", { count: stats.retentionDays })}
          />
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border px-3 py-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black text-foreground">{value}</p>
    </div>
  );
}
