/** Search query history — last 30, autosaved locally + syncable */

export type SearchHistoryEntry = {
  query: string;
  at: number;
};

const PREFIX = "rek-search-history:v1:";
const MAX = 30;

function key(userId: string) {
  return `${PREFIX}${userId}`;
}

export function readSearchHistory(userId: string): SearchHistoryEntry[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SearchHistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function writeSearchHistory(
  userId: string,
  entries: SearchHistoryEntry[]
) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(key(userId), JSON.stringify(entries.slice(0, MAX)));
  } catch {
    /* quota */
  }
}

export function pushSearchHistory(userId: string, query: string) {
  const q = query.trim();
  if (!q || q.length < 1) return readSearchHistory(userId);
  const prev = readSearchHistory(userId).filter(
    (e) => e.query.toLowerCase() !== q.toLowerCase()
  );
  const next = [{ query: q, at: Date.now() }, ...prev].slice(0, MAX);
  writeSearchHistory(userId, next);
  return next;
}

export function removeSearchHistory(userId: string, query: string) {
  const next = readSearchHistory(userId).filter((e) => e.query !== query);
  writeSearchHistory(userId, next);
  return next;
}

export function clearSearchHistory(userId: string) {
  writeSearchHistory(userId, []);
  return [];
}
