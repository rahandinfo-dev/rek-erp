"use client";

import type { SessionRecord } from "@/lib/recovery/types";

export async function fetchServerSessions(): Promise<SessionRecord[]> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return [];
    const res = await fetch("/api/recovery", { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) return [];
    return json.data as SessionRecord[];
  } catch {
    return [];
  }
}

export async function syncSessionToServer(
  record: SessionRecord
): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return false;
    const res = await fetch("/api/recovery", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteServerSession(moduleKey: string): Promise<void> {
  try {
    await fetch(`/api/recovery?moduleKey=${encodeURIComponent(moduleKey)}`, {
      method: "DELETE",
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

export async function deleteAllServerSessions(): Promise<void> {
  try {
    await fetch("/api/recovery?all=1", { method: "DELETE", keepalive: true });
  } catch {
    /* ignore */
  }
}

export async function logRecoveryAudit(input: {
  action:
    | "RECOVERY_CREATED"
    | "RECOVERY_RESTORED"
    | "RECOVERY_DELETED"
    | "RECOVERY_EXPIRED";
  moduleKey: string;
  summary?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await fetch("/api/recovery/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}
