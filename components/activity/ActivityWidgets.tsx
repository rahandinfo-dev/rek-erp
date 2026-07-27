"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, User, Users } from "lucide-react";
import type { AuditLogRow } from "@/lib/audit/query";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_MODULE_LABELS,
} from "@/lib/audit/modules";
import { relativeTime } from "@/lib/drafts/centerMeta";
import { useT } from "@/components/i18n/LocaleProvider";

function useActivityFeed(params: string) {
  const [items, setItems] = useState<AuditLogRow[]>([]);

  useEffect(() => {
    let active = true;
    const id = window.setTimeout(() => {
      void fetch(`/api/audit-logs?${params}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (active && j.success) setItems(j.data.items || []);
        })
        .catch(() => undefined);
    }, 0);

    const poll = window.setInterval(() => {
      void fetch(`/api/audit-logs?${params}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (active && j.success) setItems(j.data.items || []);
        })
        .catch(() => undefined);
    }, 15000);

    return () => {
      active = false;
      window.clearTimeout(id);
      window.clearInterval(poll);
    };
  }, [params]);

  return items;
}

function ActivityListCard({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: typeof Activity;
  items: AuditLogRow[];
  empty: string;
}) {
  const { t } = useT();
  return (
    <section aria-label={title} className="rek-card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black text-foreground">{title}</h2>
        </div>
        <Link
          href="/dashboard/activity"
          className="text-xs font-bold text-primary hover:underline"
        >
          {t("activityWidgets.timeline")}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((r) => (
            <li key={r.id} className="px-5 py-3">
              <p className="truncate text-sm font-bold text-foreground">
                {r.recordName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {r.userName || "سیستەم"} ·{" "}
                {AUDIT_ACTION_LABELS[r.action] || r.action} ·{" "}
                {AUDIT_MODULE_LABELS[r.module] || r.module} ·{" "}
                {relativeTime(new Date(r.createdAt).getTime())}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RecentActivityWidget() {
  const { t } = useT();
  const items = useActivityFeed("pageSize=6&sort=newest");
  return (
    <ActivityListCard
      title={t("activityWidgets.recentActivity")}
      icon={Activity}
      items={items}
      empty={t("activityWidgets.noRecent")}
    />
  );
}

export function MyActivityWidget() {
  const { t } = useT();
  const items = useActivityFeed("pageSize=6&sort=newest&scope=mine");
  return (
    <ActivityListCard
      title={t("activityWidgets.myActivity")}
      icon={User}
      items={items}
      empty={t("activityWidgets.yourActions")}
    />
  );
}

export function TeamActivityWidget() {
  const { t } = useT();
  const items = useActivityFeed("pageSize=6&sort=newest");
  return (
    <ActivityListCard
      title={t("activityWidgets.teamActivity")}
      icon={Users}
      items={items}
      empty={t("activityWidgets.noTeam")}
    />
  );
}

export function FailedOperationsWidget() {
  const { t } = useT();
  const items = useActivityFeed("pageSize=6&sort=newest&status=failed");
  return (
    <ActivityListCard
      title={t("activityWidgets.failedOperations")}
      icon={AlertTriangle}
      items={items}
      empty={t("activityWidgets.noFailed")}
    />
  );
}
