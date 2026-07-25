"use client";

import {
  HISTORY_LIMIT,
  HISTORY_PREFIX,
  WORKSPACE_KEY,
  rankHistoryAction,
  type HistoryItem,
  type WorkspaceSnapshot,
} from "@/lib/history/types";

function listKey(userId: string) {
  return `${HISTORY_PREFIX}${userId}`;
}

function workspaceScoped(userId: string) {
  return `${WORKSPACE_KEY}${userId}`;
}

export function readLocalHistory(userId: string): HistoryItem[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(listKey(userId));
    if (!raw) return [];
    const list = JSON.parse(raw) as HistoryItem[];
    if (!Array.isArray(list)) return [];
    const now = Date.now();
    return list
      .filter(
        (i) =>
          i &&
          i.version === 1 &&
          i.userId === userId &&
          (i.pinned || !i.expiresAt || i.expiresAt > now)
      )
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.openedAt - a.openedAt;
      });
  } catch {
    return [];
  }
}

export function writeLocalHistory(userId: string, items: HistoryItem[]) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const pinned = items.filter((i) => i.pinned);
    const unpinned = items
      .filter((i) => !i.pinned)
      .sort((a, b) => b.openedAt - a.openedAt)
      .slice(0, HISTORY_LIMIT);
    const next = [...pinned, ...unpinned].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.openedAt - a.openedAt;
    });
    localStorage.setItem(listKey(userId), JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function upsertLocalHistory(userId: string, item: HistoryItem) {
  const list = readLocalHistory(userId);
  const idx = list.findIndex((i) => i.href === item.href);
  if (idx >= 0) {
    const prev = list[idx]!;
    list[idx] = {
      ...prev,
      ...item,
      id: prev.id,
      pinned: prev.pinned || item.pinned,
      // Prefer stronger action: created > edited > viewed
      action: rankAction(item.action, prev.action),
      title: item.title || prev.title,
      thumbnail: item.thumbnail || prev.thumbnail,
      visitCount: (prev.visitCount || 1) + 1,
    };
  } else {
    list.unshift({ ...item, visitCount: item.visitCount || 1 });
  }
  writeLocalHistory(userId, list);
  return readLocalHistory(userId);
}

function rankAction(
  a: HistoryItem["action"],
  b: HistoryItem["action"]
): HistoryItem["action"] {
  return rankHistoryAction(a, b);
}

export function removeLocalHistory(userId: string, href: string) {
  writeLocalHistory(
    userId,
    readLocalHistory(userId).filter((i) => i.href !== href)
  );
}

export function toggleLocalPin(userId: string, href: string) {
  const list = readLocalHistory(userId).map((i) =>
    i.href === href
      ? {
          ...i,
          pinned: !i.pinned,
          expiresAt: !i.pinned ? null : i.expiresAt,
        }
      : i
  );
  writeLocalHistory(userId, list);
  return readLocalHistory(userId);
}

export function readLocalWorkspace(userId: string): WorkspaceSnapshot | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(workspaceScoped(userId));
    if (!raw) return null;
    const w = JSON.parse(raw) as WorkspaceSnapshot;
    if (!w || w.version !== 1 || w.userId !== userId) return null;
    return w;
  } catch {
    return null;
  }
}

export function writeLocalWorkspace(snap: WorkspaceSnapshot) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(workspaceScoped(snap.userId), JSON.stringify(snap));
  } catch {
    /* ignore */
  }
}
