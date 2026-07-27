"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitBranch, History, RotateCcw } from "lucide-react";
import type { EntityVersionRow } from "@/lib/versions/types";
import { VERSION_ACTION_LABELS } from "@/lib/versions/types";
import { useT } from "@/components/i18n/LocaleProvider";

type Stats = {
  recent: EntityVersionRow[];
  restoreHistory: EntityVersionRow[];
  mostEdited: Array<{
    entityType: string;
    entityId: string;
    recordName: string;
    edits: number;
    href: string | null;
  }>;
};

function WidgetShell({
  title,
  href,
  icon: Icon,
  children,
  empty,
}: {
  title: string;
  href: string;
  icon: typeof History;
  children: React.ReactNode;
  empty?: boolean;
}) {
  const { t } = useT();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black">
          <Icon size={16} className="text-primary" aria-hidden />
          {title}
        </h3>
        <Link
          href={href}
          className="text-xs font-bold text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/35"
        >
          {t("versionsUi.viewAll")}
        </Link>
      </div>
      {empty ? (
        <p className="text-xs text-muted-foreground">{t("versionsUi.noData")}</p>
      ) : (
        children
      )}
    </div>
  );
}

function useVersionStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      void fetch("/api/versions/stats", { cache: "no-store" })
        .then((r) => r.json())
        .then((json) => {
          if (!cancelled && json.success) setStats(json.data);
        })
        .catch(() => undefined);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);
  return stats;
}

export function RecentChangesWidget() {
  const { t } = useT();
  const stats = useVersionStats();
  const items = stats?.recent || [];
  return (
    <WidgetShell
      title={t("versionsUi.recentChanges")}
      href="/dashboard/version-history"
      icon={History}
      empty={!stats || items.length === 0}
    >
      <ul className="space-y-2">
        {items.map((row) => (
          <li key={row.id}>
            <Link
              href={`/dashboard/version-history?id=${row.id}`}
              className="block rounded-xl border border-border/70 px-3 py-2 text-xs hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/35"
            >
              <span className="font-bold">
                v{row.versionNumber} · {row.recordName}
              </span>
              <span className="mt-0.5 block text-muted-foreground">
                {VERSION_ACTION_LABELS[row.action] || row.action} ·{" "}
                {row.userName || "سیستەم"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

export function MostEditedRecordsWidget() {
  const { t } = useT();
  const stats = useVersionStats();
  const items = stats?.mostEdited || [];
  return (
    <WidgetShell
      title={t("versionsUi.mostEdited")}
      href="/dashboard/version-history?sort=version_desc"
      icon={GitBranch}
      empty={!stats || items.length === 0}
    >
      <ul className="space-y-2">
        {items.map((row) => (
          <li key={`${row.entityType}-${row.entityId}`}>
            <Link
              href={
                row.href ||
                `/dashboard/version-history?entityType=${encodeURIComponent(row.entityType)}&entityId=${encodeURIComponent(row.entityId)}`
              }
              className="flex items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2 text-xs hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/35"
            >
              <span className="min-w-0 truncate font-bold">{row.recordName}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {t("versionsUi.editsCount", { count: row.edits })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

export function RestoreHistoryWidget() {
  const { t } = useT();
  const stats = useVersionStats();
  const items = stats?.restoreHistory || [];
  return (
    <WidgetShell
      title={t("versionsUi.restoreHistory")}
      href="/dashboard/version-history?action=RESTORE"
      icon={RotateCcw}
      empty={!stats || items.length === 0}
    >
      <ul className="space-y-2">
        {items.map((row) => (
          <li key={row.id}>
            <Link
              href={`/dashboard/version-history?id=${row.id}`}
              className="block rounded-xl border border-border/70 px-3 py-2 text-xs hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/35"
            >
              <span className="font-bold">{row.recordName}</span>
              <span className="mt-0.5 block text-muted-foreground">
                v{row.versionNumber} · {row.date} {row.time}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
