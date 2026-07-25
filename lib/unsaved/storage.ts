import {
  emptySaveGuardPrefs,
  type SaveGuardPrefs,
  type SaveHistoryEntry,
} from "@/lib/unsaved/types";

const PREFS_KEY = "rek-save-guard:v1:";
const HISTORY_KEY = "rek-save-history:v1:";
const MAX_HISTORY = 40;

function prefsKey(userId: string) {
  return `${PREFS_KEY}${userId}`;
}

function historyKey(userId: string) {
  return `${HISTORY_KEY}${userId}`;
}

export function readLocalSaveGuardPrefs(
  userId: string,
  companyId: string
): SaveGuardPrefs {
  if (typeof window === "undefined" || !userId) {
    return emptySaveGuardPrefs(userId, companyId);
  }
  try {
    const raw = localStorage.getItem(prefsKey(userId));
    if (!raw) return emptySaveGuardPrefs(userId, companyId);
    const parsed = JSON.parse(raw) as Partial<SaveGuardPrefs>;
    return {
      ...emptySaveGuardPrefs(userId, companyId),
      ...parsed,
      version: 1,
      userId,
      companyId,
      autoSaveEnabled: parsed.autoSaveEnabled !== false,
      autoSaveDelayMs: ([5000, 10000, 30000, 60000] as const).includes(
        parsed.autoSaveDelayMs as 5000
      )
        ? (parsed.autoSaveDelayMs as SaveGuardPrefs["autoSaveDelayMs"])
        : 5000,
      updatedAt: Number(parsed.updatedAt || Date.now()),
    };
  } catch {
    return emptySaveGuardPrefs(userId, companyId);
  }
}

export function writeLocalSaveGuardPrefs(prefs: SaveGuardPrefs) {
  if (typeof window === "undefined" || !prefs.userId) return;
  try {
    localStorage.setItem(prefsKey(prefs.userId), JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function readLocalSaveHistory(userId: string): SaveHistoryEntry[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(historyKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SaveHistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export function pushLocalSaveHistory(
  userId: string,
  entry: SaveHistoryEntry
): SaveHistoryEntry[] {
  const next = [entry, ...readLocalSaveHistory(userId).filter((e) => e.id !== entry.id)].slice(
    0,
    MAX_HISTORY
  );
  try {
    localStorage.setItem(historyKey(userId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
