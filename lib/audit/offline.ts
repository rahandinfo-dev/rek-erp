import type { AuditLogRow } from "@/lib/audit/query";

const PREFIX = "rek-activity-cache:v1:";
const MAX = 200;

export function readActivityCache(userId: string): AuditLogRow[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(`${PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditLogRow[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function writeActivityCache(userId: string, items: AuditLogRow[]) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(
      `${PREFIX}${userId}`,
      JSON.stringify(items.slice(0, MAX))
    );
  } catch {
    /* ignore */
  }
}

export function mergeActivityCache(
  userId: string,
  incoming: AuditLogRow[]
): AuditLogRow[] {
  const prev = readActivityCache(userId);
  const map = new Map<string, AuditLogRow>();
  for (const r of [...incoming, ...prev]) map.set(r.id, r);
  const next = [...map.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  writeActivityCache(userId, next);
  return next;
}
