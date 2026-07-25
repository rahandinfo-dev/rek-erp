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
  WIDGET_CATALOG,
  buildDefaultDashboard,
  buildDefaultWidgets,
  emptyBundle,
  newDashId,
  type DashboardLayout,
  type DashboardWorkspaceBundle,
  type WidgetInstance,
  type WidgetSettings,
  type WidgetSize,
} from "@/lib/dashboard/workspace/types";
import {
  readLocalDashboardWorkspace,
  writeLocalDashboardWorkspace,
} from "@/lib/dashboard/workspace/storage";
import {
  fetchDashboardWorkspace,
  syncDashboardWorkspace,
} from "@/lib/dashboard/workspace/sync";

type Ctx = {
  ready: boolean;
  bundle: DashboardWorkspaceBundle;
  active: DashboardLayout | null;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  reorderWidgets: (orderedIds: string[]) => void;
  updateWidget: (id: string, patch: Partial<WidgetInstance>) => void;
  setWidgetSize: (id: string, size: WidgetSize) => void;
  togglePin: (id: string) => void;
  toggleFavorite: (id: string) => void;
  toggleHidden: (id: string) => void;
  toggleCollapsed: (id: string) => void;
  setWidgetSettings: (id: string, settings: Partial<WidgetSettings>) => void;
  duplicateWidget: (id: string) => void;
  removeWidget: (id: string) => void;
  restoreWidget: (widgetKey: string) => void;
  restoreDefaultLayout: () => void;
  createDashboard: (name: string) => void;
  renameDashboard: (id: string, name: string) => void;
  duplicateDashboard: (id: string) => void;
  deleteDashboard: (id: string) => void;
  switchDashboard: (id: string) => void;
  setDefaultDashboard: (id: string) => void;
  recommendations: string[];
  refresh: () => Promise<void>;
};

const DashboardWorkspaceContext = createContext<Ctx | null>(null);

function sortWidgets(widgets: WidgetInstance[]) {
  return [...widgets].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return a.order - b.order;
  });
}

export function DashboardWorkspaceProvider({
  userId,
  companyId,
  children,
  recommendModules = [],
}: {
  userId: string;
  companyId: string;
  children: ReactNode;
  recommendModules?: string[];
}) {
  const [ready, setReady] = useState(false);
  const [bundle, setBundle] = useState<DashboardWorkspaceBundle>(() =>
    emptyBundle(userId, companyId)
  );
  const [editMode, setEditMode] = useState(false);
  const syncTimer = useRef<number | undefined>(undefined);

  const persist = useCallback(
    (next: DashboardWorkspaceBundle, sync = true) => {
      const stamped = { ...next, userId, companyId, updatedAt: Date.now() };
      setBundle(stamped);
      writeLocalDashboardWorkspace(stamped);
      if (!sync) return;
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => {
        void syncDashboardWorkspace(stamped).then((remote) => {
          if (remote) {
            writeLocalDashboardWorkspace(remote);
            setBundle(remote);
          }
        });
      }, 400);
    },
    [userId, companyId]
  );

  const refresh = useCallback(async () => {
    const local = readLocalDashboardWorkspace(userId);
    let remote: DashboardWorkspaceBundle | null = null;
    if (navigator.onLine) {
      remote = await fetchDashboardWorkspace();
    }
    const best =
      remote && (!local || remote.updatedAt >= local.updatedAt)
        ? remote
        : local || emptyBundle(userId, companyId);
    persist(best, false);
  }, [userId, companyId, persist]);

  useEffect(() => {
    if (!userId) return;
    const t = window.setTimeout(() => {
      void refresh().finally(() => setReady(true));
    }, 0);
    return () => window.clearTimeout(t);
  }, [userId, refresh]);

  useEffect(() => {
    function onOnline() {
      void refresh();
      const local = readLocalDashboardWorkspace(userId);
      if (local) void syncDashboardWorkspace(local);
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [userId, refresh]);

  const active =
    bundle.dashboards.find((d) => d.isActive) || bundle.dashboards[0] || null;

  const patchActive = useCallback(
    (fn: (dash: DashboardLayout) => DashboardLayout) => {
      if (!active) return;
      const nextDash = {
        ...fn(active),
        updatedAt: Date.now(),
      };
      persist({
        ...bundle,
        dashboards: bundle.dashboards.map((d) =>
          d.id === active.id ? nextDash : d
        ),
      });
    },
    [active, bundle, persist]
  );

  const reorderWidgets = useCallback(
    (orderedIds: string[]) => {
      patchActive((dash) => ({
        ...dash,
        widgets: sortWidgets(
          dash.widgets.map((w) => {
            const idx = orderedIds.indexOf(w.id);
            return idx >= 0 ? { ...w, order: idx } : w;
          })
        ),
      }));
    },
    [patchActive]
  );

  const updateWidget = useCallback(
    (id: string, patch: Partial<WidgetInstance>) => {
      patchActive((dash) => ({
        ...dash,
        widgets: sortWidgets(
          dash.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w))
        ),
      }));
    },
    [patchActive]
  );

  const setWidgetSize = useCallback(
    (id: string, size: WidgetSize) => updateWidget(id, { size }),
    [updateWidget]
  );
  const togglePin = useCallback(
    (id: string) => {
      const w = active?.widgets.find((x) => x.id === id);
      if (!w) return;
      updateWidget(id, { pinned: !w.pinned });
    },
    [active, updateWidget]
  );
  const toggleFavorite = useCallback(
    (id: string) => {
      const w = active?.widgets.find((x) => x.id === id);
      if (!w) return;
      updateWidget(id, { favorite: !w.favorite });
    },
    [active, updateWidget]
  );
  const toggleHidden = useCallback(
    (id: string) => {
      const w = active?.widgets.find((x) => x.id === id);
      if (!w) return;
      updateWidget(id, { hidden: !w.hidden });
    },
    [active, updateWidget]
  );
  const toggleCollapsed = useCallback(
    (id: string) => {
      const w = active?.widgets.find((x) => x.id === id);
      if (!w) return;
      updateWidget(id, { collapsed: !w.collapsed });
    },
    [active, updateWidget]
  );
  const setWidgetSettings = useCallback(
    (id: string, settings: Partial<WidgetSettings>) => {
      const w = active?.widgets.find((x) => x.id === id);
      if (!w) return;
      updateWidget(id, { settings: { ...w.settings, ...settings } });
    },
    [active, updateWidget]
  );

  const duplicateWidget = useCallback(
    (id: string) => {
      patchActive((dash) => {
        const src = dash.widgets.find((w) => w.id === id);
        if (!src) return dash;
        const copy: WidgetInstance = {
          ...src,
          id: `w_${src.widgetKey}_${Date.now()}`,
          pinned: false,
          order: dash.widgets.length,
        };
        return { ...dash, widgets: [...dash.widgets, copy] };
      });
    },
    [patchActive]
  );

  const removeWidget = useCallback(
    (id: string) => updateWidget(id, { hidden: true }),
    [updateWidget]
  );

  const restoreWidget = useCallback(
    (widgetKey: string) => {
      patchActive((dash) => {
        const existing = dash.widgets.find((w) => w.widgetKey === widgetKey);
        if (existing) {
          return {
            ...dash,
            widgets: dash.widgets.map((w) =>
              w.widgetKey === widgetKey ? { ...w, hidden: false } : w
            ),
          };
        }
        const cat = WIDGET_CATALOG.find((c) => c.key === widgetKey);
        if (!cat) return dash;
        const inst: WidgetInstance = {
          id: `w_${widgetKey}_${Date.now()}`,
          widgetKey,
          size: cat.defaultSize,
          pinned: false,
          favorite: false,
          hidden: false,
          collapsed: false,
          order: dash.widgets.length,
          settings: buildDefaultWidgets()[0]!.settings,
        };
        return { ...dash, widgets: [...dash.widgets, inst] };
      });
    },
    [patchActive]
  );

  const restoreDefaultLayout = useCallback(() => {
    if (!active) return;
    const fresh = buildDefaultDashboard(userId, companyId, active.name, active.id);
    patchActive(() => ({
      ...fresh,
      isDefault: active.isDefault,
      isActive: true,
      sortOrder: active.sortOrder,
    }));
  }, [active, userId, companyId, patchActive]);

  const createDashboard = useCallback(
    (name: string) => {
      const dash = buildDefaultDashboard(userId, companyId, name.trim() || "Dashboard");
      persist({
        ...bundle,
        dashboards: [
          ...bundle.dashboards.map((d) => ({ ...d, isActive: false })),
          { ...dash, isDefault: false, isActive: true },
        ],
      });
    },
    [bundle, persist, userId, companyId]
  );

  const renameDashboard = useCallback(
    (id: string, name: string) => {
      persist({
        ...bundle,
        dashboards: bundle.dashboards.map((d) =>
          d.id === id ? { ...d, name: name.trim() || d.name } : d
        ),
      });
    },
    [bundle, persist]
  );

  const duplicateDashboard = useCallback(
    (id: string) => {
      const src = bundle.dashboards.find((d) => d.id === id);
      if (!src) return;
      const copy: DashboardLayout = {
        ...src,
        id: newDashId(),
        name: `${src.name} Copy`,
        isDefault: false,
        isActive: true,
        updatedAt: Date.now(),
        widgets: src.widgets.map((w) => ({
          ...w,
          id: `${w.id}_copy_${Date.now()}`,
        })),
      };
      persist({
        ...bundle,
        dashboards: [
          ...bundle.dashboards.map((d) => ({ ...d, isActive: false })),
          copy,
        ],
      });
    },
    [bundle, persist]
  );

  const deleteDashboard = useCallback(
    (id: string) => {
      if (bundle.dashboards.length <= 1) return;
      const remaining = bundle.dashboards.filter((d) => d.id !== id);
      if (!remaining.some((d) => d.isActive) && remaining[0]) {
        remaining[0] = { ...remaining[0], isActive: true };
      }
      if (!remaining.some((d) => d.isDefault) && remaining[0]) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }
      persist({ ...bundle, dashboards: remaining });
    },
    [bundle, persist]
  );

  const switchDashboard = useCallback(
    (id: string) => {
      persist({
        ...bundle,
        dashboards: bundle.dashboards.map((d) => ({
          ...d,
          isActive: d.id === id,
        })),
      });
    },
    [bundle, persist]
  );

  const setDefaultDashboard = useCallback(
    (id: string) => {
      persist({
        ...bundle,
        dashboards: bundle.dashboards.map((d) => ({
          ...d,
          isDefault: d.id === id,
        })),
      });
    },
    [bundle, persist]
  );

  const recommendations = useMemo(() => {
    const mods = new Set(recommendModules);
    return WIDGET_CATALOG.filter(
      (c) =>
        c.recommendModules?.some((m) => mods.has(m)) &&
        active?.widgets.some((w) => w.widgetKey === c.key && w.hidden)
    )
      .slice(0, 5)
      .map((c) => c.key);
  }, [recommendModules, active]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      bundle,
      active,
      editMode,
      setEditMode,
      reorderWidgets,
      updateWidget,
      setWidgetSize,
      togglePin,
      toggleFavorite,
      toggleHidden,
      toggleCollapsed,
      setWidgetSettings,
      duplicateWidget,
      removeWidget,
      restoreWidget,
      restoreDefaultLayout,
      createDashboard,
      renameDashboard,
      duplicateDashboard,
      deleteDashboard,
      switchDashboard,
      setDefaultDashboard,
      recommendations,
      refresh,
    }),
    [
      ready,
      bundle,
      active,
      editMode,
      reorderWidgets,
      updateWidget,
      setWidgetSize,
      togglePin,
      toggleFavorite,
      toggleHidden,
      toggleCollapsed,
      setWidgetSettings,
      duplicateWidget,
      removeWidget,
      restoreWidget,
      restoreDefaultLayout,
      createDashboard,
      renameDashboard,
      duplicateDashboard,
      deleteDashboard,
      switchDashboard,
      setDefaultDashboard,
      recommendations,
      refresh,
    ]
  );

  return (
    <DashboardWorkspaceContext.Provider value={value}>
      {children}
    </DashboardWorkspaceContext.Provider>
  );
}

export function useDashboardWorkspace() {
  const ctx = useContext(DashboardWorkspaceContext);
  if (!ctx) {
    return {
      ready: false,
      bundle: emptyBundle("", ""),
      active: null,
      editMode: false,
      setEditMode: () => undefined,
      reorderWidgets: () => undefined,
      updateWidget: () => undefined,
      setWidgetSize: () => undefined,
      togglePin: () => undefined,
      toggleFavorite: () => undefined,
      toggleHidden: () => undefined,
      toggleCollapsed: () => undefined,
      setWidgetSettings: () => undefined,
      duplicateWidget: () => undefined,
      removeWidget: () => undefined,
      restoreWidget: () => undefined,
      restoreDefaultLayout: () => undefined,
      createDashboard: () => undefined,
      renameDashboard: () => undefined,
      duplicateDashboard: () => undefined,
      deleteDashboard: () => undefined,
      switchDashboard: () => undefined,
      setDefaultDashboard: () => undefined,
      recommendations: [] as string[],
      refresh: async () => undefined,
    };
  }
  return ctx;
}
