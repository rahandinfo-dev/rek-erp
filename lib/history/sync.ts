"use client";

import type { HistoryItem, WorkspaceSnapshot } from "@/lib/history/types";

export async function fetchServerHistory(): Promise<HistoryItem[]> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return [];
    const res = await fetch("/api/history", { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) return [];
    return json.data as HistoryItem[];
  } catch {
    return [];
  }
}

export async function syncHistoryItem(item: HistoryItem): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return false;
    const res = await fetch("/api/history", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteServerHistory(href: string): Promise<void> {
  try {
    await fetch(`/api/history?href=${encodeURIComponent(href)}`, {
      method: "DELETE",
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

export async function pinServerHistory(
  href: string,
  pinned: boolean
): Promise<void> {
  try {
    await fetch("/api/history", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ href, pinned }),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

export async function fetchServerWorkspace(): Promise<WorkspaceSnapshot | null> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    const res = await fetch("/api/history/workspace", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return json.data as WorkspaceSnapshot;
  } catch {
    return null;
  }
}

export async function syncWorkspace(
  snap: WorkspaceSnapshot
): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return false;
    const res = await fetch("/api/history/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snap),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}
