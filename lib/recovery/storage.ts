"use client";

import {
  RECOVERY_PREFIX,
  RECOVERY_TTL_MS,
  type SessionRecord,
} from "@/lib/recovery/types";

function scopedKey(userId: string, moduleKey: string) {
  return `${RECOVERY_PREFIX}${userId}:${moduleKey}`;
}

function isExpired(r: { expiresAt?: number }) {
  return !r.expiresAt || Date.now() > r.expiresAt;
}

export function listLocalSessions(userId: string): SessionRecord[] {
  if (typeof window === "undefined" || !userId) return [];
  const out: SessionRecord[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(`${RECOVERY_PREFIX}${userId}:`)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const rec = JSON.parse(raw) as SessionRecord;
        if (!rec || rec.version !== 1 || rec.userId !== userId) continue;
        if (isExpired(rec)) {
          localStorage.removeItem(k);
          continue;
        }
        out.push(rec);
      } catch {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }
  return out.sort((a, b) => b.lastEditedAt - a.lastEditedAt);
}

export function readLocalSession(
  userId: string,
  moduleKey: string
): SessionRecord | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(scopedKey(userId, moduleKey));
    if (!raw) return null;
    const rec = JSON.parse(raw) as SessionRecord;
    if (!rec || rec.version !== 1 || rec.userId !== userId || isExpired(rec)) {
      localStorage.removeItem(scopedKey(userId, moduleKey));
      return null;
    }
    return rec;
  } catch {
    return null;
  }
}

export function writeLocalSession(record: SessionRecord) {
  if (typeof window === "undefined" || !record.userId) return;
  try {
    localStorage.setItem(
      scopedKey(record.userId, record.moduleKey),
      JSON.stringify(record)
    );
  } catch {
    /* quota — ignore */
  }
}

export function deleteLocalSession(userId: string, moduleKey: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.removeItem(scopedKey(userId, moduleKey));
  } catch {
    /* ignore */
  }
}

export function deleteAllLocalSessions(userId: string) {
  for (const s of listLocalSessions(userId)) {
    deleteLocalSession(userId, s.moduleKey);
  }
}

export function cleanupExpiredSessions(userId?: string) {
  if (typeof window === "undefined") return 0;
  let removed = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith(RECOVERY_PREFIX)) keys.push(k);
    }
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const rec = JSON.parse(raw) as SessionRecord;
        if (
          !rec ||
          rec.version !== 1 ||
          isExpired(rec) ||
          (userId && rec.userId !== userId && isExpired(rec))
        ) {
          if (!rec || rec.version !== 1 || isExpired(rec)) {
            localStorage.removeItem(k);
            removed += 1;
          }
        }
      } catch {
        localStorage.removeItem(k);
        removed += 1;
      }
    }
  } catch {
    /* ignore */
  }
  return removed;
}

export function freshExpiry() {
  return Date.now() + RECOVERY_TTL_MS;
}
