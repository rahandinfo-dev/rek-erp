import type { AuditLogRow } from "@/lib/audit/query";
import { civilDayIndex } from "@/lib/utils/datetime";

export type TimelineGroupKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "older";

export type TimelineGroup = {
  key: TimelineGroupKey;
  label: string;
  items: AuditLogRow[];
};

// Day boundaries resolve in the app time zone, so the server render and the
// hydration render always place a row in the same bucket.
export function groupKeyFor(iso: string, now = new Date()): TimelineGroupKey {
  const daysAgo = civilDayIndex(now) - civilDayIndex(iso);
  if (daysAgo <= 0) return "today";
  if (daysAgo === 1) return "yesterday";
  if (daysAgo < 7) return "last7";
  if (daysAgo < 30) return "last30";
  return "older";
}

const LABELS: Record<TimelineGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 Days",
  last30: "Last Month",
  older: "Older",
};

export function groupTimeline(items: AuditLogRow[]): TimelineGroup[] {
  const buckets: Record<TimelineGroupKey, AuditLogRow[]> = {
    today: [],
    yesterday: [],
    last7: [],
    last30: [],
    older: [],
  };
  for (const item of items) {
    buckets[groupKeyFor(item.createdAt)].push(item);
  }
  return (Object.keys(buckets) as TimelineGroupKey[])
    .filter((k) => buckets[k].length)
    .map((k) => ({ key: k, label: LABELS[k], items: buckets[k] }));
}
