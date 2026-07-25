type CacheEntry<T> = { at: number; value: T };

const store = new Map<string, CacheEntry<unknown>>();

export function aiCacheGet<T>(key: string, ttlMs: number): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ttlMs) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function aiCacheSet<T>(key: string, value: T) {
  store.set(key, { at: Date.now(), value });
}

export function aiCacheKey(companyId: string, scope: string) {
  return `ai:${companyId}:${scope}`;
}
