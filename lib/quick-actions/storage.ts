import {
  emptyQuickActionPrefs,
  parseQuickActionPrefs,
} from "@/lib/quick-actions/prefs";
import type { QuickActionPrefs } from "@/lib/quick-actions/types";

const KEY = "rek-quick-action-prefs";

export function readLocalQuickActionPrefs(
  userId: string,
  companyId: string
): QuickActionPrefs {
  if (typeof window === "undefined") {
    return emptyQuickActionPrefs(userId, companyId);
  }
  try {
    const raw = localStorage.getItem(`${KEY}:${userId}`);
    if (!raw) return emptyQuickActionPrefs(userId, companyId);
    return parseQuickActionPrefs(JSON.parse(raw), userId, companyId);
  } catch {
    return emptyQuickActionPrefs(userId, companyId);
  }
}

export function writeLocalQuickActionPrefs(prefs: QuickActionPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${KEY}:${prefs.userId}`, JSON.stringify(prefs));
  } catch {
    // ignore quota
  }
}

export function ensureLocalQuickActionPrefs(
  userId: string,
  companyId: string
): QuickActionPrefs {
  const local = readLocalQuickActionPrefs(userId, companyId);
  writeLocalQuickActionPrefs(local);
  return local;
}
