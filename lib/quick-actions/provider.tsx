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
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useFavorites } from "@/lib/favorites/provider";
import { useNavigationHistory } from "@/lib/history/provider";
import { isEditableTarget } from "@/lib/undo/types";
import { ACTION_DEFS } from "@/lib/quick-actions/registry";
import {
  emptyQuickActionPrefs,
  resetQuickActionPrefs,
} from "@/lib/quick-actions/prefs";
import { runQuickAction } from "@/lib/quick-actions/run";
import {
  ensureLocalQuickActionPrefs,
  writeLocalQuickActionPrefs,
} from "@/lib/quick-actions/storage";
import {
  fetchQuickActionPrefs,
  syncQuickActionPrefs,
} from "@/lib/quick-actions/sync";
import type {
  ContextMenuState,
  PendingConfirm,
  QuickActionId,
  QuickActionPrefs,
  QuickActionRecord,
} from "@/lib/quick-actions/types";
import { normalizeModuleKey } from "@/lib/quick-actions/urls";

const SmartContextMenu = dynamic(
  () => import("@/components/quick-actions/SmartContextMenu"),
  { ssr: false }
);

type OpenMenuInput = {
  x: number;
  y: number;
  records: QuickActionRecord[];
  moduleKey: string;
};

type Ctx = {
  ready: boolean;
  prefs: QuickActionPrefs;
  focusTarget: QuickActionRecord | null;
  setFocusTarget: (record: QuickActionRecord | null) => void;
  openContextMenu: (input: OpenMenuInput) => void;
  closeContextMenu: () => void;
  runAction: (
    actionId: QuickActionId,
    records: QuickActionRecord[],
    moduleKey: string
  ) => Promise<void>;
  updatePrefs: (prefs: QuickActionPrefs) => void;
  resetPrefs: () => void;
  bindContextMenu: (
    record: QuickActionRecord
  ) => {
    onContextMenu: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onTouchMove: () => void;
    onFocus: () => void;
  };
};

const QuickActionsContext = createContext<Ctx | null>(null);

const LONG_PRESS_MS = 480;

export function QuickActionsProvider({
  userId,
  companyId,
  children,
}: {
  userId: string;
  companyId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const favorites = useFavorites();
  const history = useNavigationHistory();
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState<QuickActionPrefs>(() =>
    emptyQuickActionPrefs(userId, companyId)
  );
  const [menu, setMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    records: [],
    moduleKey: "products",
  });
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [focusTarget, setFocusTarget] = useState<QuickActionRecord | null>(
    null
  );
  const syncTimer = useRef<number | undefined>(undefined);
  const longPressTimer = useRef<number | undefined>(undefined);

  const persist = useCallback(
    (next: QuickActionPrefs, sync = true) => {
      const stamped = {
        ...next,
        userId,
        companyId,
        updatedAt: Date.now(),
      };
      setPrefs(stamped);
      writeLocalQuickActionPrefs(stamped);
      if (!sync) return;
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => {
        void syncQuickActionPrefs(stamped).then((remote) => {
          if (remote) {
            writeLocalQuickActionPrefs(remote);
            setPrefs(remote);
          }
        });
      }, 400);
    },
    [userId, companyId]
  );

  const refresh = useCallback(async () => {
    const local = ensureLocalQuickActionPrefs(userId, companyId);
    let remote: QuickActionPrefs | null = null;
    if (navigator.onLine) remote = await fetchQuickActionPrefs();
    const best =
      remote && remote.updatedAt >= local.updatedAt ? remote : local;
    persist(best, false);
  }, [userId, companyId, persist]);

  useEffect(() => {
    if (!userId) return;
    const t = window.setTimeout(() => {
      void refresh().finally(() => setReady(true));
    }, 0);
    return () => window.clearTimeout(t);
  }, [userId, refresh]);

  const closeContextMenu = useCallback(() => {
    setMenu((m) => ({ ...m, open: false }));
  }, []);

  const openContextMenu = useCallback((input: OpenMenuInput) => {
    setMenu({
      open: true,
      x: input.x,
      y: input.y,
      records: input.records,
      moduleKey: normalizeModuleKey(input.moduleKey),
    });
    if (input.records[0]) setFocusTarget(input.records[0]);
  }, []);

  const execute = useCallback(
    async (
      actionId: QuickActionId,
      records: QuickActionRecord[],
      moduleKey: string
    ) => {
      setBusy(true);
      try {
        await runQuickAction(actionId, records, moduleKey, {
          routerPush: (href) => router.push(href),
          toggleFavorite: favorites.toggleFavorite,
          toggleHistoryPin: history.togglePin,
          isFavorite: favorites.isFavorite,
          onComplete: () => {
            window.dispatchEvent(
              new CustomEvent("rek:quick-action-complete", {
                detail: { actionId, moduleKey, ids: records.map((r) => r.id) },
              })
            );
          },
        });
      } finally {
        setBusy(false);
        closeContextMenu();
        setPending(null);
      }
    },
    [
      router,
      favorites.toggleFavorite,
      favorites.isFavorite,
      history.togglePin,
      closeContextMenu,
    ]
  );

  const runAction = useCallback(
    async (
      actionId: QuickActionId,
      records: QuickActionRecord[],
      moduleKey: string
    ) => {
      const def = ACTION_DEFS[actionId];
      if (!def || !records.length) return;

      if (def.destructive) {
        setPending({
          actionId,
          records,
          moduleKey,
          title:
            actionId === "soft_delete"
              ? "Soft delete?"
              : actionId === "archive"
                ? "Archive?"
                : `${def.label}?`,
          description:
            records.length > 1
              ? `Apply “${def.label}” to ${records.length} records? This can be undone from Recycle Bin or Undo where supported.`
              : `Apply “${def.label}” to “${records[0]!.label}”?`,
        });
        closeContextMenu();
        return;
      }

      await execute(actionId, records, moduleKey);
    },
    [execute, closeContextMenu]
  );

  const updatePrefs = useCallback(
    (next: QuickActionPrefs) => persist(next, true),
    [persist]
  );

  const resetPrefs = useCallback(() => {
    persist(resetQuickActionPrefs(userId, companyId), true);
  }, [persist, userId, companyId]);

  const bindContextMenu = useCallback(
    (record: QuickActionRecord) => {
      const clearLong = () => {
        window.clearTimeout(longPressTimer.current);
        longPressTimer.current = undefined;
      };

      return {
        onContextMenu: (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          openContextMenu({
            x: e.clientX,
            y: e.clientY,
            records: [record],
            moduleKey: record.moduleKey,
          });
        },
        onTouchStart: (e: React.TouchEvent) => {
          const touch = e.touches[0];
          if (!touch) return;
          clearLong();
          longPressTimer.current = window.setTimeout(() => {
            openContextMenu({
              x: touch.clientX,
              y: touch.clientY,
              records: [record],
              moduleKey: record.moduleKey,
            });
          }, LONG_PRESS_MS);
        },
        onTouchEnd: clearLong,
        onTouchMove: clearLong,
        onFocus: () => setFocusTarget(record),
      };
    },
    [openContextMenu]
  );

  // Keyboard shortcuts for focused / selected record
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!focusTarget) return;
      if (isEditableTarget(e.target)) return;
      if (menu.open) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const moduleKey = normalizeModuleKey(focusTarget.moduleKey);

      const fire = (id: QuickActionId) => {
        e.preventDefault();
        void runAction(id, [focusTarget], moduleKey);
      };

      if (!mod && key === "e") fire("edit");
      else if (!mod && (key === "v" || e.key === "Enter")) {
        if (e.key === "Enter") fire("view");
      } else if (mod && key === "d") fire("duplicate");
      else if (mod && e.shiftKey && key === "c") fire("copy_link");
      else if (e.key === "سڕینەوە" || e.key === "Backspace") {
        // Prefer toolbar data-keyboard-delete; fallback to focused
        const btn = document.querySelector<HTMLButtonElement>(
          "[data-keyboard-delete]"
        );
        if (btn) return;
        fire("soft_delete");
      }
    }

    function onDeleteSelected() {
      if (!focusTarget) return;
      void runAction(
        "soft_delete",
        [focusTarget],
        normalizeModuleKey(focusTarget.moduleKey)
      );
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("rek:delete-selected", onDeleteSelected);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("rek:delete-selected", onDeleteSelected);
    };
  }, [focusTarget, menu.open, runAction]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      prefs,
      focusTarget,
      setFocusTarget,
      openContextMenu,
      closeContextMenu,
      runAction,
      updatePrefs,
      resetPrefs,
      bindContextMenu,
    }),
    [
      ready,
      prefs,
      focusTarget,
      openContextMenu,
      closeContextMenu,
      runAction,
      updatePrefs,
      resetPrefs,
      bindContextMenu,
    ]
  );

  return (
    <QuickActionsContext.Provider value={value}>
      {children}
      <SmartContextMenu
        open={menu.open}
        x={menu.x}
        y={menu.y}
        moduleKey={menu.moduleKey}
        records={menu.records}
        prefs={prefs}
        onClose={closeContextMenu}
        onAction={(id) =>
          void runAction(id, menu.records, menu.moduleKey)
        }
      />
      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.title || ""}
        description={pending?.description || ""}
        confirmText="پشتڕاستکردنەوە"
        cancelText="هەڵوەشاندنەوە"
        loading={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          void execute(
            pending.actionId,
            pending.records,
            pending.moduleKey
          );
        }}
      />
    </QuickActionsContext.Provider>
  );
}

export function useQuickActions() {
  const ctx = useContext(QuickActionsContext);
  if (!ctx) {
    throw new Error("useQuickActions must be used within QuickActionsProvider");
  }
  return ctx;
}

/** Safe hook when provider may be absent (no-op bindings). */
export function useQuickActionsOptional() {
  return useContext(QuickActionsContext);
}
