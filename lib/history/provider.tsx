"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  HISTORY_MODULE_LABELS,
  freshHistoryExpiry,
  moduleFromPath,
  parseHistoryTarget,
  type HistoryAction,
  type HistoryItem,
  type WorkspaceSnapshot,
} from "@/lib/history/types";
import {
  readLocalHistory,
  readLocalWorkspace,
  removeLocalHistory,
  toggleLocalPin,
  upsertLocalHistory,
  writeLocalHistory,
  writeLocalWorkspace,
} from "@/lib/history/storage";
import {
  deleteServerHistory,
  fetchServerHistory,
  fetchServerWorkspace,
  pinServerHistory,
  syncHistoryItem,
  syncWorkspace,
} from "@/lib/history/sync";

type Ctx = {
  userId: string;
  companyId: string;
  items: HistoryItem[];
  refresh: () => Promise<void>;
  track: (partial: Partial<HistoryItem> & { href: string; title: string }) => void;
  markCreated: (href: string, title: string, moduleKey?: string) => void;
  markEdited: (href: string, title?: string) => void;
  markPrinted: (href: string, title: string, moduleKey?: string) => void;
  markDownloaded: (href: string, title: string, moduleKey?: string) => void;
  remove: (href: string) => Promise<void>;
  togglePin: (href: string) => Promise<void>;
  resumeWorkspace: () => void;
  workspace: WorkspaceSnapshot | null;
};

const HistoryContext = createContext<Ctx | null>(null);

function newId() {
  return crypto.randomUUID?.() || `hist_${Date.now()}`;
}

function mergeHistory(local: HistoryItem[], remote: HistoryItem[]) {
  const map = new Map<string, HistoryItem>();
  for (const r of remote) map.set(r.href, r);
  for (const l of local) {
    const prev = map.get(l.href);
    if (!prev || l.openedAt >= prev.openedAt) {
      map.set(l.href, {
        ...prev,
        ...l,
        pinned: Boolean(prev?.pinned || l.pinned),
      });
    } else if (prev) {
      map.set(l.href, {
        ...l,
        ...prev,
        pinned: Boolean(prev.pinned || l.pinned),
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.openedAt - a.openedAt;
  });
}

function guessTitle(pathname: string, moduleKey: string) {
  const h1 = document.querySelector("h1");
  const fromH1 = h1?.textContent?.trim();
  if (fromH1 && fromH1.length < 120) return fromH1;
  const doc = document.title?.split("|")[0]?.trim();
  if (doc && doc.length > 1) return doc;
  return HISTORY_MODULE_LABELS[moduleKey] || pathname;
}

function guessThumbnail() {
  const el = document.querySelector<HTMLImageElement>(
    "img[data-history-thumb], .product-image img, main img"
  );
  const src = el?.currentSrc || el?.src;
  if (!src || src.startsWith("data:")) return null;
  if (src.length > 400) return null;
  return src;
}

export function NavigationHistoryProvider({
  userId,
  companyId,
  children,
}: {
  userId: string;
  companyId: string;
  children: ReactNode;
}) {
  const pathname = usePathname() || "/dashboard";
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const lastHref = useRef("");
  const restoredWorkspace = useRef(false);
  const createdHint = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const local = readLocalHistory(userId);
    let remote: HistoryItem[] = [];
    if (navigator.onLine) {
      remote = await fetchServerHistory();
    }
    const merged = mergeHistory(local, remote);
    writeLocalHistory(userId, merged);
    setItems(merged);
  }, [userId]);

  const track = useCallback(
    (
      partial: Partial<HistoryItem> & { href: string; title: string }
    ) => {
      if (!userId) return;
      const now = Date.now();
      const moduleKey =
        partial.moduleKey || moduleFromPath(partial.href) || "general";
      const item: HistoryItem = {
        version: 1,
        id: partial.id || newId(),
        userId,
        companyId,
        moduleKey,
        entityType: partial.entityType ?? null,
        entityId: partial.entityId ?? null,
        href: partial.href,
        title: partial.title,
        subtitle:
          partial.subtitle ?? HISTORY_MODULE_LABELS[moduleKey] ?? moduleKey,
        thumbnail: partial.thumbnail ?? null,
        action: (partial.action as HistoryAction) || "viewed",
        pinned: Boolean(partial.pinned),
        openedAt: partial.openedAt || now,
        expiresAt:
          partial.expiresAt !== undefined
            ? partial.expiresAt
            : freshHistoryExpiry(Boolean(partial.pinned)),
      };

      // Created hint: if we just visited /new then open entity, mark created
      if (
        createdHint.current &&
        partial.href.startsWith(createdHint.current) &&
        item.action === "viewed"
      ) {
        item.action = "created";
        createdHint.current = null;
      }

      const next = upsertLocalHistory(userId, item);
      setItems(next);
      void syncHistoryItem(next.find((i) => i.href === item.href) || item);
    },
    [userId, companyId]
  );

  const markCreated = useCallback(
    (href: string, title: string, moduleKey?: string) => {
      track({
        href,
        title,
        moduleKey: moduleKey || moduleFromPath(href),
        action: "created",
      });
    },
    [track]
  );

  const markEdited = useCallback(
    (href: string, title?: string) => {
      const existing = readLocalHistory(userId).find((i) => i.href === href);
      track({
        href,
        title: title || existing?.title || href,
        moduleKey: existing?.moduleKey || moduleFromPath(href),
        action: "edited",
        thumbnail: existing?.thumbnail,
      });
    },
    [track, userId]
  );

  const markPrinted = useCallback(
    (href: string, title: string, moduleKey?: string) => {
      track({
        href,
        title,
        moduleKey: moduleKey || moduleFromPath(href),
        action: "printed",
      });
    },
    [track]
  );

  const markDownloaded = useCallback(
    (href: string, title: string, moduleKey?: string) => {
      track({
        href,
        title,
        moduleKey: moduleKey || moduleFromPath(href),
        action: "downloaded",
      });
    },
    [track]
  );

  const resumeWorkspace = useCallback(() => {
    const snap = workspace || readLocalWorkspace(userId);
    if (!snap?.pathname) return;
    router.push(`${snap.pathname}${snap.search || ""}`);
  }, [workspace, userId, router]);

  const remove = useCallback(
    async (href: string) => {
      removeLocalHistory(userId, href);
      setItems(readLocalHistory(userId));
      await deleteServerHistory(href);
    },
    [userId]
  );

  const togglePin = useCallback(
    async (href: string) => {
      const next = toggleLocalPin(userId, href);
      setItems(next);
      const item = next.find((i) => i.href === href);
      if (item) await pinServerHistory(href, item.pinned);
    },
    [userId]
  );

  // Boot + sync
  useEffect(() => {
    if (!userId) return;
    const t = window.setTimeout(() => {
      void refresh();
      void (async () => {
        const local = readLocalWorkspace(userId);
        const remote = navigator.onLine ? await fetchServerWorkspace() : null;
        const best =
          remote && (!local || remote.updatedAt >= local.updatedAt)
            ? remote
            : local;
        if (best) {
          writeLocalWorkspace(best);
          setWorkspace(best);
        }
      })();
    }, 0);
    return () => window.clearTimeout(t);
  }, [userId, refresh]);

  // Track page visits
  useEffect(() => {
    if (!userId) return;

    if (pathname.endsWith("/new")) {
      // Remember module prefix for create → detail transition
      createdHint.current = pathname.replace(/\/new$/, "/");
    }

    const target = parseHistoryTarget(pathname);
    if (!target?.trackable) {
      // Still save workspace
    } else if (lastHref.current !== target.href) {
      lastHref.current = target.href;
      // Delay slightly so page title / h1 hydrate
      const t = window.setTimeout(() => {
        track({
          href: target.href,
          title: guessTitle(pathname, target.moduleKey),
          moduleKey: target.moduleKey,
          entityType: target.entityType,
          entityId: target.entityId,
          action: target.action,
          thumbnail: guessThumbnail(),
        });
      }, 350);
      return () => window.clearTimeout(t);
    }
  }, [pathname, userId, track]);

  // Workspace snapshot
  useEffect(() => {
    if (!userId) return;
    const search = typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(search);
    const snap: WorkspaceSnapshot = {
      version: 1,
      userId,
      companyId,
      pathname,
      search,
      tab: params.get("tab"),
      filters: Object.fromEntries(
        [...params.entries()].filter(
          ([k]) => !["tab", "sort", "page", "pageSize"].includes(k)
        )
      ),
      sort: params.get("sort"),
      page: params.get("page"),
      updatedAt: Date.now(),
    };
    writeLocalWorkspace(snap);
    const t = window.setTimeout(() => {
      setWorkspace(snap);
      void syncWorkspace(snap);
    }, 800);
    return () => window.clearTimeout(t);
  }, [pathname, userId, companyId]);

  // Optional: restore last workspace once per session when landing on dashboard
  useEffect(() => {
    if (!userId || restoredWorkspace.current) return;
    if (pathname !== "/dashboard") {
      restoredWorkspace.current = true;
      return;
    }
    restoredWorkspace.current = true;
    const snap = readLocalWorkspace(userId);
    if (!snap || snap.pathname === "/dashboard") return;
    // Soft restore: only if user has a recent workspace within 8 hours
    if (Date.now() - snap.updatedAt > 8 * 60 * 60 * 1000) return;
    // Don't force-navigate — expose via widget / optional. Spec says restore automatically.
    // Auto-restore can surprise users; navigate only if they refreshed mid-work.
    try {
      if (sessionStorage.getItem("rek-workspace-restored") === "1") return;
      const navType = (
        performance.getEntriesByType("navigation")[0] as
          | PerformanceNavigationTiming
          | undefined
      )?.type;
      if (navType === "reload" && snap.pathname.startsWith("/dashboard")) {
        sessionStorage.setItem("rek-workspace-restored", "1");
        router.replace(`${snap.pathname}${snap.search || ""}`);
      }
    } catch {
      /* ignore */
    }
  }, [pathname, userId, router]);

  // Online flush
  useEffect(() => {
    function onOnline() {
      void refresh();
      for (const item of readLocalHistory(userId)) {
        void syncHistoryItem(item);
      }
      const w = readLocalWorkspace(userId);
      if (w) void syncWorkspace(w);
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [userId, refresh]);

  const value = useMemo<Ctx>(
    () => ({
      userId,
      companyId,
      items,
      refresh,
      track,
      markCreated,
      markEdited,
      markPrinted,
      markDownloaded,
      remove,
      togglePin,
      resumeWorkspace,
      workspace,
    }),
    [
      userId,
      companyId,
      items,
      refresh,
      track,
      markCreated,
      markEdited,
      markPrinted,
      markDownloaded,
      remove,
      togglePin,
      resumeWorkspace,
      workspace,
    ]
  );

  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
}

export function useNavigationHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) {
    return {
      userId: "",
      companyId: "",
      items: [] as HistoryItem[],
      refresh: async () => undefined,
      track: () => undefined,
      markCreated: () => undefined,
      markEdited: () => undefined,
      markPrinted: () => undefined,
      markDownloaded: () => undefined,
      remove: async () => undefined,
      togglePin: async () => undefined,
      resumeWorkspace: () => undefined,
      workspace: null as WorkspaceSnapshot | null,
    };
  }
  return ctx;
}
