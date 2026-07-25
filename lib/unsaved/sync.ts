import type { SaveGuardPrefs, SaveHistoryEntry } from "@/lib/unsaved/types";

export async function fetchSaveGuardPrefs(): Promise<SaveGuardPrefs | null> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    const res = await fetch("/api/unsaved/prefs", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return json.data as SaveGuardPrefs;
  } catch {
    return null;
  }
}

export async function syncSaveGuardPrefs(
  prefs: SaveGuardPrefs
): Promise<SaveGuardPrefs | null> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    const res = await fetch("/api/unsaved/prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
      keepalive: true,
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return json.data as SaveGuardPrefs;
  } catch {
    return null;
  }
}

export async function postSaveAudit(input: {
  sourceId: string;
  label: string;
  action: "save" | "discard" | "conflict-mine" | "conflict-theirs" | "conflict-merge" | "retry-failed";
  summary: string[];
  status: "ok" | "error" | "offline";
  device: string;
  durationMs?: number;
}) {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    await fetch("/api/unsaved/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

export async function syncSaveHistory(entries: SaveHistoryEntry[]) {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    await fetch("/api/unsaved/history", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: entries.slice(0, 40) }),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}
