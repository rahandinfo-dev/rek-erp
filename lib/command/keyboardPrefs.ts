/** Keyboard productivity preferences — shortcuts, favorites, history */

export const KEYBOARD_PREFS_PREFIX = "rek-keyboard:v1:";

export type ShortcutBinding = {
  /** Chord like "Ctrl+Shift+P" */
  keys: string;
  disabled?: boolean;
};

export type KeyboardPrefs = {
  version: 1;
  userId: string;
  companyId: string;
  /** shortcutId → binding */
  bindings: Record<string, ShortcutBinding>;
  favoriteCommandIds: string[];
  commandHistory: Array<{ id: string; at: number }>;
  updatedAt: number;
};

/** Default global shortcut ids */
export const DEFAULT_BINDINGS: Record<string, ShortcutBinding> = {
  "global-search": { keys: "Ctrl+K" },
  "command-palette": { keys: "Ctrl+Shift+P" },
  "cheat-sheet": { keys: "Ctrl+/" },
  "ai-assistant": { keys: "Ctrl+Shift+A" },
  "create-new": { keys: "Ctrl+N" },
  "manual-save": { keys: "Ctrl+S" },
  undo: { keys: "Ctrl+Z" },
  redo: { keys: "Ctrl+Shift+Z" },
  print: { keys: "Ctrl+P" },
  "page-search": { keys: "Ctrl+F" },
  refresh: { keys: "Ctrl+R" },
  duplicate: { keys: "Ctrl+D" },
  "delete-selected": { keys: "Delete" },
  "nav-1": { keys: "Ctrl+1" },
  "nav-2": { keys: "Ctrl+2" },
  "nav-3": { keys: "Ctrl+3" },
  "nav-4": { keys: "Ctrl+4" },
  "nav-5": { keys: "Ctrl+5" },
  "nav-6": { keys: "Ctrl+6" },
  "nav-7": { keys: "Ctrl+7" },
  "nav-8": { keys: "Ctrl+8" },
  "nav-9": { keys: "Ctrl+9" },
};

export const NAV_SLOT_HREFS: Record<string, string> = {
  "nav-1": "/dashboard",
  "nav-2": "/dashboard/products",
  "nav-3": "/dashboard/sales",
  "nav-4": "/dashboard/purchases",
  "nav-5": "/dashboard/inventory",
  "nav-6": "/dashboard/customers",
  "nav-7": "/dashboard/suppliers",
  "nav-8": "/dashboard/reports",
  "nav-9": "/dashboard/settings",
};

export function emptyKeyboardPrefs(
  userId: string,
  companyId: string
): KeyboardPrefs {
  return {
    version: 1,
    userId,
    companyId,
    bindings: { ...DEFAULT_BINDINGS },
    favoriteCommandIds: [],
    commandHistory: [],
    updatedAt: Date.now(),
  };
}

export function resolveBinding(
  prefs: KeyboardPrefs,
  shortcutId: string
): ShortcutBinding | null {
  const custom = prefs.bindings[shortcutId];
  if (custom) return custom;
  return DEFAULT_BINDINGS[shortcutId] || null;
}

export function formatChordLabel(keys: string) {
  return keys
    .replace(/Ctrl/gi, "Ctrl")
    .replace(/Meta/gi, "⌘")
    .replace(/Shift/gi, "Shift")
    .replace(/Alt/gi, "Alt");
}

/** Normalize event → chord string matching our defaults (Ctrl+Shift+P) */
export function eventToChord(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  let key = e.key;
  if (key === " ") key = "Space";
  if (key.length === 1) key = key.toUpperCase();
  if (key === "Escape") key = "Esc";
  if (key === "ArrowUp") key = "Up";
  if (key === "ArrowDown") key = "Down";
  if (key === "ArrowLeft") key = "Left";
  if (key === "ArrowRight") key = "Right";
  // Avoid duplicating modifiers as key
  if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
    parts.push(key);
  }
  return parts.join("+");
}

export function chordsEqual(a: string, b: string) {
  return normalizeChord(a) === normalizeChord(b);
}

export function normalizeChord(chord: string) {
  return chord
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const l = p.toLowerCase();
      if (l === "cmd" || l === "meta" || l === "control" || l === "ctrl")
        return "Ctrl";
      if (l === "shift") return "Shift";
      if (l === "alt" || l === "option") return "Alt";
      if (l === "/") return "/";
      return p.length === 1 ? p.toUpperCase() : p;
    })
    .join("+");
}

export function findShortcutConflicts(
  prefs: KeyboardPrefs,
  shortcutId: string,
  keys: string
): string[] {
  const target = normalizeChord(keys);
  const conflicts: string[] = [];
  const all = { ...DEFAULT_BINDINGS, ...prefs.bindings };
  for (const [id, binding] of Object.entries(all)) {
    if (id === shortcutId || binding.disabled) continue;
    if (normalizeChord(binding.keys) === target) conflicts.push(id);
  }
  return conflicts;
}
