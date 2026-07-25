import {
  KEYBOARD_PREFS_PREFIX,
  emptyKeyboardPrefs,
  type KeyboardPrefs,
} from "@/lib/command/keyboardPrefs";

function key(userId: string) {
  return `${KEYBOARD_PREFS_PREFIX}${userId}`;
}

export function readLocalKeyboardPrefs(userId: string): KeyboardPrefs | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KeyboardPrefs;
    if (!parsed || parsed.version !== 1 || parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalKeyboardPrefs(prefs: KeyboardPrefs) {
  if (typeof window === "undefined" || !prefs.userId) return;
  try {
    localStorage.setItem(
      key(prefs.userId),
      JSON.stringify({ ...prefs, updatedAt: Date.now() })
    );
  } catch {
    /* quota */
  }
}

export function ensureLocalKeyboardPrefs(
  userId: string,
  companyId: string
): KeyboardPrefs {
  return (
    readLocalKeyboardPrefs(userId) || emptyKeyboardPrefs(userId, companyId)
  );
}
