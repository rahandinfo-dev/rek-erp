import type { CommandItem } from "@/lib/command/types";

const KEY = "rek-command-recents:v2:";
const MAX = 30;

function storageKey(userId?: string) {
  return `${KEY}${userId || "anon"}`;
}

export function readCommandRecents(userId?: string): CommandItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) {
      // migrate legacy key
      const legacy = localStorage.getItem("rek-command-recents");
      if (!legacy) return [];
      const parsed = JSON.parse(legacy) as CommandItem[];
      return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
    }
    const parsed = JSON.parse(raw) as CommandItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushCommandRecent(item: CommandItem, userId?: string) {
  if (typeof window === "undefined") return;
  try {
    const prev = readCommandRecents(userId).filter((x) => x.id !== item.id);
    const next = [
      {
        ...item,
        section: "recent" as const,
      },
      ...prev,
    ].slice(0, MAX);
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}
