"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers3, BarChart3 } from "lucide-react";
import {
  BULK_ACTION_LABELS,
  BULK_MODULE_LABELS,
} from "@/lib/bulk/types";
import { relativeTime } from "@/lib/drafts/centerMeta";

type JobRow = {
  id: string;
  moduleKey: string;
  action: string;
  status: string;
  successCount: number;
  totalCount: number;
  createdAt: number;
};

type Stats = {
  total: number;
  week: number;
  recordsTouched: number;
  recordsSucceeded: number;
  recordsFailed: number;
};

export function RecentBulkOperationsWidget() {
  const [items, setItems] = useState<JobRow[]>([]);
  useEffect(() => {
    let active = true;
    const id = window.setTimeout(() => {
      void fetch("/api/bulk/jobs?limit=6", { cache: "no-store" })
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

  return (
    <section
      aria-label="Recent Bulk Operations"
      className="rek-card overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Layers3 size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black">Recent Bulk Operations</h2>
        </div>
        <Link
          href="/dashboard/bulk"
          className="text-xs font-bold text-primary hover:underline"
        >
          Center
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          No bulk jobs yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((j) => (
            <li key={j.id} className="px-5 py-3">
              <p className="truncate text-sm font-bold">
                {BULK_ACTION_LABELS[j.action] || j.action} ·{" "}
                {BULK_MODULE_LABELS[j.moduleKey] || j.moduleKey}
              </p>
              <p className="text-xs text-muted-foreground">
                {j.successCount}/{j.totalCount} · {j.status} ·{" "}
                {relativeTime(j.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function BulkStatisticsWidget() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    let active = true;
    const id = window.setTimeout(() => {
      void fetch("/api/bulk/stats", { cache: "no-store" })
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

  return (
    <section
      aria-label="Bulk Statistics"
      className="rek-card overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black">Bulk Statistics</h2>
        </div>
        <Link
          href="/dashboard/bulk"
          className="text-xs font-bold text-primary hover:underline"
        >
          Open
        </Link>
      </div>
      {!stats ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-3">
          <Stat label="Jobs" value={stats.total} />
          <Stat label="This week" value={stats.week} />
          <Stat label="Records" value={stats.recordsTouched} />
          <Stat label="Succeeded" value={stats.recordsSucceeded} />
          <Stat label="سەرنەکەوت" value={stats.recordsFailed} />
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border px-3 py-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}
