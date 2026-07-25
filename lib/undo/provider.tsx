"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { undoStore } from "@/lib/undo/stack";
import { performRedo, performUndo } from "@/lib/undo/push";
import { flushOfflineUndoOps } from "@/lib/undo/offline";
import { isEditableTarget, type UndoModule } from "@/lib/undo/types";

type UndoContextValue = {
  userId: string;
  companyId: string;
  canUndo: boolean;
  canRedo: boolean;
  undo: (module?: UndoModule) => Promise<boolean>;
  redo: (module?: UndoModule) => Promise<boolean>;
};

const UndoContext = createContext<UndoContextValue | null>(null);

function subscribe(cb: () => void) {
  return undoStore.subscribe(cb);
}

function getSnapshot() {
  return undoStore.getSnapshot();
}

function getServerSnapshot() {
  return undoStore.getServerSnapshot();
}

export function UndoProvider({
  userId,
  companyId,
  children,
}: {
  userId: string;
  companyId: string;
  children: ReactNode;
}) {
  useEffect(() => {
    undoStore.setOwner(userId, companyId);
  }, [userId, companyId]);

  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        void performUndo();
        return;
      }
      if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        void performRedo();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onOnline() {
      void flushOfflineUndoOps();
    }
    window.addEventListener("online", onOnline);
    if (navigator.onLine) void flushOfflineUndoOps();
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const undo = useCallback(
    (module?: UndoModule) => performUndo(module),
    []
  );
  const redo = useCallback(
    (module?: UndoModule) => performRedo(module),
    []
  );

  const value = useMemo<UndoContextValue>(
    () => ({
      userId,
      companyId,
      canUndo: snap.canUndo,
      canRedo: snap.canRedo,
      undo,
      redo,
    }),
    [userId, companyId, snap.canUndo, snap.canRedo, undo, redo]
  );

  return (
    <UndoContext.Provider value={value}>{children}</UndoContext.Provider>
  );
}

export function useUndoRedo() {
  const ctx = useContext(UndoContext);
  if (!ctx) {
    return {
      userId: "",
      companyId: "",
      canUndo: false,
      canRedo: false,
      undo: async () => false,
      redo: async () => false,
    };
  }
  return ctx;
}
