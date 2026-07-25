"use client";

const OFFLINE_KEY = "rek-undo-offline:v1";

export type OfflineUndoOp = {
  type: "audit" | "http";
  payload: unknown;
  url?: string;
  method?: string;
  body?: unknown;
  createdAt: number;
};

export function queueOfflineUndoOp(op: OfflineUndoOp) {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY);
    const list: OfflineUndoOp[] = raw ? JSON.parse(raw) : [];
    list.push(op);
    // Cap queue
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(list.slice(-80)));
  } catch {
    /* ignore */
  }
}

export async function flushOfflineUndoOps() {
  let list: OfflineUndoOp[] = [];
  try {
    const raw = localStorage.getItem(OFFLINE_KEY);
    list = raw ? JSON.parse(raw) : [];
  } catch {
    return;
  }
  if (!list.length) return;

  const remaining: OfflineUndoOp[] = [];
  for (const op of list) {
    try {
      if (op.type === "audit") {
        await fetch("/api/undo/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(op.payload),
        });
      } else if (op.type === "http" && op.url) {
        await fetch(op.url, {
          method: op.method || "POST",
          headers: { "Content-Type": "application/json" },
          body: op.body != null ? JSON.stringify(op.body) : undefined,
        });
      }
    } catch {
      remaining.push(op);
    }
  }

  try {
    if (remaining.length) {
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(OFFLINE_KEY);
    }
  } catch {
    /* ignore */
  }
}
