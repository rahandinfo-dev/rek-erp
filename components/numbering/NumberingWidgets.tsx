"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, FileText, Hash } from "lucide-react";
import { relativeTime } from "@/lib/drafts/centerMeta";
import { MODULE_LABELS } from "@/lib/numbering/types";

type Doc = {
  id: string;
  module: string;
  number: string;
  label: string;
  href: string;
  createdAt: number;
};

type Stats = {
  rulesEnabled: number;
  countersIssued: number;
  recentDocuments: Doc[];
  duplicateAlerts: Array<{ type: string; value: string; count: number }>;
};

function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    let active = true;
    const id = window.setTimeout(() => {
      void fetch("/api/numbering/stats", { cache: "no-store" })
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

export function RecentDocumentsWidget() {
  const stats = useStats();
  const items = stats?.recentDocuments || [];
  return (
    <section aria-label="Recent Documents" className="rek-card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black">Recent Documents</h2>
        </div>
        <Link
          href="/dashboard/settings/numbering"
          className="text-xs font-bold text-primary hover:underline"
        >
          Numbering
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          No recent numbered documents.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((d) => (
            <li key={`${d.module}-${d.id}`} className="px-5 py-3">
              <Link href={d.href} className="block hover:underline">
                <p className="truncate text-sm font-bold">{d.label}</p>
                <p className="text-xs text-muted-foreground">
                  {MODULE_LABELS[d.module] || d.module} ·{" "}
                  {relativeTime(d.createdAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function NumberingStatisticsWidget() {
  const stats = useStats();
  return (
    <section
      aria-label="Numbering Statistics"
      className="rek-card overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Hash size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black">Numbering Statistics</h2>
        </div>
        <Link
          href="/dashboard/settings/numbering"
          className="text-xs font-bold text-primary hover:underline"
        >
          Settings
        </Link>
      </div>
      {!stats ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-5 py-5">
          <div className="rounded-xl border border-border px-3 py-3">
            <p className="text-xs font-bold text-muted-foreground">
              Rules enabled
            </p>
            <p className="mt-1 text-xl font-black">{stats.rulesEnabled}</p>
          </div>
          <div className="rounded-xl border border-border px-3 py-3">
            <p className="text-xs font-bold text-muted-foreground">
              Numbers issued
            </p>
            <p className="mt-1 text-xl font-black">{stats.countersIssued}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function DuplicateDetectionWidget() {
  const stats = useStats();
  const alerts = stats?.duplicateAlerts || [];
  return (
    <section
      aria-label="Duplicate Detection Alerts"
      className="rek-card overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black">Duplicate Detection</h2>
        </div>
        <Link
          href="/dashboard/settings/numbering"
          className="text-xs font-bold text-primary hover:underline"
        >
          Review
        </Link>
      </div>
      {alerts.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          No duplicate SKU/barcode alerts.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {alerts.map((a) => (
            <li key={`${a.type}-${a.value}`} className="px-5 py-3">
              <p className="truncate text-sm font-bold text-destructive">
                {a.type.toUpperCase()}: {a.value}
              </p>
              <p className="text-xs text-muted-foreground">{a.count} records</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
