"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb, Trash2, BarChart3 } from "lucide-react";
import type { RecycleBinItem } from "@/lib/recycle/types";
import { relativeTime } from "@/lib/drafts/centerMeta";

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
  const items = useRecentDeleted();
  return (
    <section aria-label="Recently Deleted" className="rek-card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Trash2 size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black text-foreground">Recently Deleted</h2>
        </div>
        <Link
          href="/dashboard/recycle-bin"
          className="text-xs font-bold text-primary hover:underline"
        >
          Recycle Bin
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          No deleted records.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((r) => (
            <li key={r.id} className="px-5 py-3">
              <p className="truncate text-sm font-bold text-foreground">{r.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.moduleLabel} · {r.deletedBy || "سیستەم"} ·{" "}
                {relativeTime(r.deletedAt)} · {r.daysRemaining}d left
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RestoreSuggestionsWidget() {
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
      aria-label="Restore Suggestions"
      className="rek-card overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Lightbulb size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black text-foreground">
            Restore Suggestions
          </h2>
        </div>
        <Link
          href="/dashboard/recycle-bin"
          className="text-xs font-bold text-primary hover:underline"
        >
          Review
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          No restore suggestions right now.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((r) => (
            <li key={r.id} className="px-5 py-3">
              <p className="truncate text-sm font-bold text-foreground">{r.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.daysRemaining <= 7
                  ? "Expiring soon — restore recommended"
                  : "Safe to restore"}{" "}
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
  const stats = useRecycleStats();
  return (
    <section
      aria-label="Recycle Bin Statistics"
      className="rek-card overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black text-foreground">
            Recycle Bin Statistics
          </h2>
        </div>
        <Link
          href="/dashboard/recycle-bin"
          className="text-xs font-bold text-primary hover:underline"
        >
          Open
        </Link>
      </div>
      {!stats ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-3">
          <Stat label="In bin" value={stats.deleted} />
          <Stat label="گەڕێندرایەوە" value={stats.restored} />
          <Stat label="Purged" value={stats.purged} />
          <Stat label="This week" value={stats.recent} />
          <Stat label="Expiring soon" value={stats.expiringSoon} />
          <Stat label="Retention" value={`${stats.retentionDays}d`} />
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
