import {
  DRAFT_PREFIX,
  DRAFT_TTL_MS,
  type DraftMeta,
  type DraftRecord,
} from "@/lib/drafts/types";
import {
  defaultTitleForKey,
  deviceLabel,
  estimateProgress,
  moduleFromDraftKey,
  moduleLabel,
  modifiedFieldLabels,
  resumeHrefForKey,
  type DraftListItem,
} from "@/lib/drafts/centerMeta";

function scopedKey(userId: string, key: string) {
  return `${DRAFT_PREFIX}${userId}:${key}`;
}

function isExpired(record: { expiresAt?: number; savedAt?: number }) {
  const expiresAt =
    record.expiresAt ??
    (record.savedAt ? record.savedAt + DRAFT_TTL_MS : 0);
  return !expiresAt || Date.now() > expiresAt;
}

/** Migrate / ignore legacy v1 unscoped drafts. */
function parseRecord<T>(raw: string): DraftRecord<T> | null {
  try {
    const parsed = JSON.parse(raw) as DraftRecord<T> & { version?: number };
    if (!parsed || parsed.data == null) return null;
    if (parsed.version === 2) {
      if (!parsed.userId || !parsed.key) return null;
      if (isExpired(parsed)) return null;
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function readDraft<T>(
  userId: string,
  key: string
): DraftRecord<T> | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(scopedKey(userId, key));
    if (!raw) return null;
    const record = parseRecord<T>(raw);
    if (!record) {
      localStorage.removeItem(scopedKey(userId, key));
      return null;
    }
    if (record.userId !== userId) return null;
    return record;
  } catch {
    return null;
  }
}

export function writeDraft<T>(
  userId: string,
  companyId: string,
  key: string,
  data: T,
  metaPatch?: Partial<DraftMeta>
): DraftRecord<T> {
  if (typeof window === "undefined") {
    throw new Error("localStorage unavailable");
  }
  if (!userId) {
    throw new Error("draft owner required");
  }

  const prev = readDraft<T>(userId, key);
  const now = Date.now();
  const moduleKey = metaPatch?.moduleKey || prev?.meta?.moduleKey || moduleFromDraftKey(key);
  const progress =
    metaPatch?.progress ??
    estimateProgress(data);
  const meta: DraftMeta = {
    title: metaPatch?.title || prev?.meta?.title || defaultTitleForKey(key),
    status: metaPatch?.status || prev?.meta?.status || "draft",
    pinned: metaPatch?.pinned ?? prev?.meta?.pinned ?? false,
    archived: metaPatch?.archived ?? prev?.meta?.archived ?? false,
    moduleKey,
    device: metaPatch?.device || prev?.meta?.device || deviceLabel(),
    progress,
    tags: metaPatch?.tags || prev?.meta?.tags || [],
    shareToken: metaPatch?.shareToken ?? prev?.meta?.shareToken ?? null,
    createdAt: prev?.meta?.createdAt || prev?.savedAt || now,
  };

  const record: DraftRecord<T> = {
    version: 2,
    key,
    userId,
    companyId,
    savedAt: now,
    expiresAt: now + DRAFT_TTL_MS,
    data,
    meta,
  };

  localStorage.setItem(scopedKey(userId, key), JSON.stringify(record));
  return record;
}

export function clearDraft(userId: string, key: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.removeItem(scopedKey(userId, key));
  } catch {
    /* ignore */
  }
}

/** Enumerate local drafts for Draft Center (current user only). */
export function listLocalDrafts(userId: string): DraftListItem[] {
  if (typeof window === "undefined" || !userId) return [];
  const out: DraftListItem[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(DRAFT_PREFIX)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const record = parseRecord<unknown>(raw);
      if (!record || record.userId !== userId) continue;
      if (isExpired(record)) {
        localStorage.removeItem(k);
        continue;
      }
      const moduleKey = record.meta?.moduleKey || moduleFromDraftKey(record.key);
      out.push({
        key: record.key,
        title: record.meta?.title || defaultTitleForKey(record.key),
        moduleKey,
        moduleLabel: moduleLabel(moduleKey),
        status: record.meta?.archived
          ? "archived"
          : record.meta?.status || "draft",
        pinned: Boolean(record.meta?.pinned),
        archived: Boolean(record.meta?.archived),
        progress: record.meta?.progress ?? estimateProgress(record.data),
        device: record.meta?.device || null,
        tags: record.meta?.tags || [],
        createdAt: record.meta?.createdAt || record.savedAt,
        savedAt: record.savedAt,
        updatedAt: record.savedAt,
        resumeHref: resumeHrefForKey(record.key),
        shareToken: record.meta?.shareToken,
        modifiedFields: modifiedFieldLabels(record.data),
        source: "form",
      });
    }
  } catch {
    /* ignore */
  }
  return out;
}

/** Remove expired drafts and foreign-user leftovers for this browser. */
export function cleanupExpiredDrafts(currentUserId?: string) {
  if (typeof window === "undefined") return 0;
  let removed = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DRAFT_PREFIX)) keys.push(k);
    }
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as DraftRecord<unknown>;
        if (
          !parsed ||
          parsed.version !== 2 ||
          isExpired(parsed) ||
          (currentUserId && parsed.userId !== currentUserId)
        ) {
          if (!parsed || parsed.version !== 2 || isExpired(parsed)) {
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

export type DraftSyncResult = {
  ok: boolean;
  conflict?: boolean;
  theirs?: DraftRecord<unknown> | null;
};

/** Best-effort sync mirror to server (non-blocking). */
export async function syncDraftToServer(input: {
  key: string;
  data: unknown;
  savedAt: number;
  expiresAt: number;
  baseSavedAt?: number;
  meta?: DraftMeta;
}): Promise<DraftSyncResult> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { ok: false };
    }
    const res = await fetch("/api/drafts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      keepalive: true,
    });
    if (res.status === 409) {
      const json = await res.json().catch(() => null);
      return {
        ok: false,
        conflict: true,
        theirs: (json?.data?.theirs as DraftRecord<unknown>) || null,
      };
    }
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export async function deleteServerDraft(key: string): Promise<void> {
  try {
    await fetch(`/api/drafts?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

export async function fetchServerDraft<T>(
  key: string
): Promise<DraftRecord<T> | null> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    const res = await fetch(`/api/drafts?key=${encodeURIComponent(key)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    const record = json.data as DraftRecord<T>;
    if (record.version !== 2 || isExpired(record)) return null;
    return record;
  } catch {
    return null;
  }
}

export async function fetchDraftList(params?: {
  includeArchived?: boolean;
}): Promise<DraftListItem[]> {
  try {
    const q = params?.includeArchived ? "?archived=1" : "";
    const res = await fetch(`/api/drafts${q}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) return [];
    return json.data as DraftListItem[];
  } catch {
    return [];
  }
}
