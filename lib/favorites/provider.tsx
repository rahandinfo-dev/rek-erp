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
import {
  DEFAULT_FAVORITES,
  displayName,
  emptyBundle,
  type FavoriteColor,
  type FavoriteGroup,
  type FavoriteItem,
  type FavoriteWorkspace,
  type FavoritesBundle,
  type FavoritesUiState,
} from "@/lib/favorites/types";
import {
  readFavoritesUi,
  readLocalFavorites,
  writeFavoritesUi,
  writeLocalFavorites,
} from "@/lib/favorites/storage";
import {
  bootstrapFavorites,
  fetchFavoritesBundle,
  syncFavoritesBundle,
} from "@/lib/favorites/sync";
import { moduleFromPath } from "@/lib/history/types";

function newId() {
  return crypto.randomUUID?.() || `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function sortBundle(bundle: FavoritesBundle): FavoritesBundle {
  return {
    ...bundle,
    workspaces: [...bundle.workspaces].sort((a, b) => a.sortOrder - b.sortOrder),
    groups: [...bundle.groups].sort((a, b) => a.sortOrder - b.sortOrder),
    items: [...bundle.items].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    }),
    updatedAt: Date.now(),
  };
}

type Ctx = {
  ready: boolean;
  bundle: FavoritesBundle;
  ui: FavoritesUiState;
  activeWorkspace: FavoriteWorkspace | null;
  activeItems: FavoriteItem[];
  activeGroups: FavoriteGroup[];
  isFavorite: (href: string) => boolean;
  toggleFavorite: (input: {
    href: string;
    title: string;
    moduleKey?: string;
    entityType?: string | null;
    entityId?: string | null;
  }) => void;
  setAlias: (href: string, alias: string | null) => void;
  setColor: (href: string, color: FavoriteColor | null) => void;
  togglePin: (href: string) => void;
  moveToGroup: (href: string, groupId: string | null) => void;
  removeFavorite: (href: string) => void;
  reorderItems: (orderedHrefs: string[]) => void;
  createGroup: (name: string, color?: FavoriteColor | null) => void;
  renameGroup: (groupId: string, name: string) => void;
  deleteGroup: (groupId: string) => void;
  reorderGroups: (orderedIds: string[]) => void;
  createWorkspace: (name: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => void;
  switchWorkspace: (id: string) => void;
  setSection: (section: "favorites" | "recent") => void;
  setCollapsed: (collapsed: boolean) => void;
  exportFavorites: () => string;
  importFavorites: (json: string) => boolean;
  refresh: () => Promise<void>;
};

const FavoritesContext = createContext<Ctx | null>(null);

export function FavoritesProvider({
  userId,
  companyId,
  children,
}: {
  userId: string;
  companyId: string;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [bundle, setBundle] = useState<FavoritesBundle>(() =>
    emptyBundle(userId, companyId)
  );
  const [ui, setUi] = useState<FavoritesUiState>({
    section: "favorites",
    collapsed: false,
  });
  const syncTimer = useRef<number | undefined>(undefined);

  const persist = useCallback(
    (next: FavoritesBundle, sync = true) => {
      const sorted = sortBundle({ ...next, userId, companyId });
      setBundle(sorted);
      writeLocalFavorites(sorted);
      if (!sync) return;
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => {
        void syncFavoritesBundle(sorted).then((remote) => {
          if (remote) {
            writeLocalFavorites(remote);
            setBundle(sortBundle(remote));
          }
        });
      }, 400);
    },
    [userId, companyId]
  );

  const refresh = useCallback(async () => {
    const local = readLocalFavorites(userId);
    let remote: FavoritesBundle | null = null;
    if (navigator.onLine) {
      remote = await fetchFavoritesBundle();
      if (!remote || remote.workspaces.length === 0) {
        remote = await bootstrapFavorites();
      }
    }
    const best =
      remote && (!local || remote.updatedAt >= local.updatedAt)
        ? remote
        : local;
    if (best && best.workspaces.length) {
      persist(best, false);
    } else if (!local) {
      // Local defaults offline
      const wsId = newId();
      const defaults: FavoritesBundle = {
        version: 1,
        userId,
        companyId,
        workspaces: [
          { id: wsId, name: "Default", sortOrder: 0, isActive: true },
        ],
        groups: [],
        items: DEFAULT_FAVORITES.map((f, idx) => ({
          id: newId(),
          workspaceId: wsId,
          groupId: null,
          href: f.href,
          title: f.title,
          alias: null,
          moduleKey: f.moduleKey,
          entityType: null,
          entityId: null,
          color: null,
          pinned: idx < 2,
          sortOrder: idx,
          updatedAt: Date.now(),
        })),
        updatedAt: Date.now(),
      };
      persist(defaults, Boolean(navigator.onLine));
    }
  }, [userId, companyId, persist]);

  useEffect(() => {
    if (!userId) return;
    const t = window.setTimeout(() => {
      setUi(readFavoritesUi(userId));
      void refresh().finally(() => setReady(true));
    }, 0);
    return () => window.clearTimeout(t);
  }, [userId, refresh]);

  useEffect(() => {
    function onOnline() {
      void refresh();
      const local = readLocalFavorites(userId);
      if (local) void syncFavoritesBundle(local);
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [userId, refresh]);

  const activeWorkspace =
    bundle.workspaces.find((w) => w.isActive) || bundle.workspaces[0] || null;

  const activeItems = useMemo(() => {
    if (!activeWorkspace) return [];
    return bundle.items.filter((i) => i.workspaceId === activeWorkspace.id);
  }, [bundle.items, activeWorkspace]);

  const activeGroups = useMemo(() => {
    if (!activeWorkspace) return [];
    return bundle.groups.filter((g) => g.workspaceId === activeWorkspace.id);
  }, [bundle.groups, activeWorkspace]);

  const isFavorite = useCallback(
    (href: string) => {
      if (!activeWorkspace) return false;
      return bundle.items.some(
        (i) => i.workspaceId === activeWorkspace.id && i.href === href
      );
    },
    [bundle.items, activeWorkspace]
  );

  const ensureWorkspace = useCallback(
    (b: FavoritesBundle): FavoritesBundle => {
      if (b.workspaces.length) return b;
      const id = newId();
      return {
        ...b,
        workspaces: [
          { id, name: "Default", sortOrder: 0, isActive: true },
        ],
      };
    },
    []
  );

  const toggleFavorite = useCallback(
    (input: {
      href: string;
      title: string;
      moduleKey?: string;
      entityType?: string | null;
      entityId?: string | null;
    }) => {
      let next = ensureWorkspace({ ...bundle });
      const ws =
        next.workspaces.find((w) => w.isActive) || next.workspaces[0]!;
      const existing = next.items.find(
        (i) => i.workspaceId === ws.id && i.href === input.href
      );
      if (existing) {
        next = {
          ...next,
          items: next.items.filter((i) => i.id !== existing.id),
        };
      } else {
        const maxOrder = next.items
          .filter((i) => i.workspaceId === ws.id)
          .reduce((m, i) => Math.max(m, i.sortOrder), -1);
        next = {
          ...next,
          items: [
            ...next.items,
            {
              id: newId(),
              workspaceId: ws.id,
              groupId: null,
              href: input.href,
              title: input.title,
              alias: null,
              moduleKey: input.moduleKey || moduleFromPath(input.href),
              entityType: input.entityType ?? null,
              entityId: input.entityId ?? null,
              color: null,
              pinned: false,
              sortOrder: maxOrder + 1,
              updatedAt: Date.now(),
            },
          ],
        };
      }
      persist(next);
    },
    [bundle, ensureWorkspace, persist]
  );

  const patchItem = useCallback(
    (href: string, patch: Partial<FavoriteItem>) => {
      if (!activeWorkspace) return;
      persist({
        ...bundle,
        items: bundle.items.map((i) =>
          i.workspaceId === activeWorkspace.id && i.href === href
            ? { ...i, ...patch, updatedAt: Date.now() }
            : i
        ),
      });
    },
    [bundle, activeWorkspace, persist]
  );

  const setAlias = useCallback(
    (href: string, alias: string | null) => patchItem(href, { alias }),
    [patchItem]
  );
  const setColor = useCallback(
    (href: string, color: FavoriteColor | null) => patchItem(href, { color }),
    [patchItem]
  );
  const togglePin = useCallback(
    (href: string) => {
      const item = activeItems.find((i) => i.href === href);
      if (!item) return;
      patchItem(href, { pinned: !item.pinned });
    },
    [activeItems, patchItem]
  );
  const moveToGroup = useCallback(
    (href: string, groupId: string | null) => patchItem(href, { groupId }),
    [patchItem]
  );
  const removeFavorite = useCallback(
    (href: string) => {
      if (!activeWorkspace) return;
      persist({
        ...bundle,
        items: bundle.items.filter(
          (i) => !(i.workspaceId === activeWorkspace.id && i.href === href)
        ),
      });
    },
    [bundle, activeWorkspace, persist]
  );

  const reorderItems = useCallback(
    (orderedHrefs: string[]) => {
      if (!activeWorkspace) return;
      persist({
        ...bundle,
        items: bundle.items.map((i) => {
          if (i.workspaceId !== activeWorkspace.id) return i;
          const idx = orderedHrefs.indexOf(i.href);
          return idx >= 0 ? { ...i, sortOrder: idx, updatedAt: Date.now() } : i;
        }),
      });
    },
    [bundle, activeWorkspace, persist]
  );

  const createGroup = useCallback(
    (name: string, color: FavoriteColor | null = null) => {
      if (!activeWorkspace) return;
      const max = activeGroups.reduce((m, g) => Math.max(m, g.sortOrder), -1);
      persist({
        ...bundle,
        groups: [
          ...bundle.groups,
          {
            id: newId(),
            workspaceId: activeWorkspace.id,
            name: name.trim() || "Group",
            color,
            sortOrder: max + 1,
          },
        ],
      });
    },
    [bundle, activeWorkspace, activeGroups, persist]
  );

  const renameGroup = useCallback(
    (groupId: string, name: string) => {
      persist({
        ...bundle,
        groups: bundle.groups.map((g) =>
          g.id === groupId ? { ...g, name: name.trim() || g.name } : g
        ),
      });
    },
    [bundle, persist]
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      persist({
        ...bundle,
        groups: bundle.groups.filter((g) => g.id !== groupId),
        items: bundle.items.map((i) =>
          i.groupId === groupId ? { ...i, groupId: null } : i
        ),
      });
    },
    [bundle, persist]
  );

  const reorderGroups = useCallback(
    (orderedIds: string[]) => {
      persist({
        ...bundle,
        groups: bundle.groups.map((g) => {
          const idx = orderedIds.indexOf(g.id);
          return idx >= 0 ? { ...g, sortOrder: idx } : g;
        }),
      });
    },
    [bundle, persist]
  );

  const createWorkspace = useCallback(
    (name: string) => {
      const max = bundle.workspaces.reduce(
        (m, w) => Math.max(m, w.sortOrder),
        -1
      );
      const id = newId();
      persist({
        ...bundle,
        workspaces: [
          ...bundle.workspaces.map((w) => ({ ...w, isActive: false })),
          {
            id,
            name: name.trim() || "Workspace",
            sortOrder: max + 1,
            isActive: true,
          },
        ],
      });
    },
    [bundle, persist]
  );

  const renameWorkspace = useCallback(
    (id: string, name: string) => {
      persist({
        ...bundle,
        workspaces: bundle.workspaces.map((w) =>
          w.id === id ? { ...w, name: name.trim() || w.name } : w
        ),
      });
    },
    [bundle, persist]
  );

  const deleteWorkspace = useCallback(
    (id: string) => {
      if (bundle.workspaces.length <= 1) return;
      const remaining = bundle.workspaces.filter((w) => w.id !== id);
      if (!remaining.some((w) => w.isActive) && remaining[0]) {
        remaining[0] = { ...remaining[0], isActive: true };
      }
      persist({
        ...bundle,
        workspaces: remaining,
        groups: bundle.groups.filter((g) => g.workspaceId !== id),
        items: bundle.items.filter((i) => i.workspaceId !== id),
      });
    },
    [bundle, persist]
  );

  const switchWorkspace = useCallback(
    (id: string) => {
      persist({
        ...bundle,
        workspaces: bundle.workspaces.map((w) => ({
          ...w,
          isActive: w.id === id,
        })),
      });
    },
    [bundle, persist]
  );

  const setSection = useCallback(
    (section: "favorites" | "recent") => {
      const next = { ...ui, section };
      setUi(next);
      writeFavoritesUi(userId, next);
    },
    [ui, userId]
  );

  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      const next = { ...ui, collapsed };
      setUi(next);
      writeFavoritesUi(userId, next);
    },
    [ui, userId]
  );

  const exportFavorites = useCallback(() => {
    return JSON.stringify(bundle, null, 2);
  }, [bundle]);

  const importFavorites = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json) as FavoritesBundle;
        if (!parsed?.items || !parsed?.workspaces) return false;
        persist({
          ...parsed,
          version: 1,
          userId,
          companyId,
          updatedAt: Date.now(),
        });
        return true;
      } catch {
        return false;
      }
    },
    [persist, userId, companyId]
  );

  const value = useMemo<Ctx>(
    () => ({
      ready,
      bundle,
      ui,
      activeWorkspace,
      activeItems,
      activeGroups,
      isFavorite,
      toggleFavorite,
      setAlias,
      setColor,
      togglePin,
      moveToGroup,
      removeFavorite,
      reorderItems,
      createGroup,
      renameGroup,
      deleteGroup,
      reorderGroups,
      createWorkspace,
      renameWorkspace,
      deleteWorkspace,
      switchWorkspace,
      setSection,
      setCollapsed,
      exportFavorites,
      importFavorites,
      refresh,
    }),
    [
      ready,
      bundle,
      ui,
      activeWorkspace,
      activeItems,
      activeGroups,
      isFavorite,
      toggleFavorite,
      setAlias,
      setColor,
      togglePin,
      moveToGroup,
      removeFavorite,
      reorderItems,
      createGroup,
      renameGroup,
      deleteGroup,
      reorderGroups,
      createWorkspace,
      renameWorkspace,
      deleteWorkspace,
      switchWorkspace,
      setSection,
      setCollapsed,
      exportFavorites,
      importFavorites,
      refresh,
    ]
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    return {
      ready: false,
      bundle: emptyBundle("", ""),
      ui: { section: "favorites" as const, collapsed: false },
      activeWorkspace: null,
      activeItems: [] as FavoriteItem[],
      activeGroups: [] as FavoriteGroup[],
      isFavorite: () => false,
      toggleFavorite: () => undefined,
      setAlias: () => undefined,
      setColor: () => undefined,
      togglePin: () => undefined,
      moveToGroup: () => undefined,
      removeFavorite: () => undefined,
      reorderItems: () => undefined,
      createGroup: () => undefined,
      renameGroup: () => undefined,
      deleteGroup: () => undefined,
      reorderGroups: () => undefined,
      createWorkspace: () => undefined,
      renameWorkspace: () => undefined,
      deleteWorkspace: () => undefined,
      switchWorkspace: () => undefined,
      setSection: () => undefined,
      setCollapsed: () => undefined,
      exportFavorites: () => "{}",
      importFavorites: () => false,
      refresh: async () => undefined,
    };
  }
  return ctx;
}

export { displayName };
