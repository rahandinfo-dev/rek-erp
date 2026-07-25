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
          Timeline
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
                {r.userName || "System"} ·{" "}
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
  const items = useActivityFeed("pageSize=6&sort=newest");
  return (
    <ActivityListCard
      title="Recent Activity"
      icon={Activity}
      items={items}
      empty="No recent activity yet."
    />
  );
}

export function MyActivityWidget() {
  const items = useActivityFeed("pageSize=6&sort=newest&scope=mine");
  return (
    <ActivityListCard
      title="My Activity"
      icon={User}
      items={items}
      empty="Your actions will appear here."
    />
  );
}

export function TeamActivityWidget() {
  const items = useActivityFeed("pageSize=6&sort=newest");
  return (
    <ActivityListCard
      title="Team Activity"
      icon={Users}
      items={items}
      empty="No team activity yet."
    />
  );
}

export function FailedOperationsWidget() {
  const items = useActivityFeed("pageSize=6&sort=newest&status=failed");
  return (
    <ActivityListCard
      title="Failed Operations"
      icon={AlertTriangle}
      items={items}
      empty="No failed operations."
    />
  );
}
