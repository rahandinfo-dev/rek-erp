"use client";

import { undoStore } from "@/lib/undo/stack";
import {
  UNDO_WINDOW_MS,
  type UndoActionKind,
  type UndoEntry,
  type UndoModule,
} from "@/lib/undo/types";
import { appToast } from "@/lib/toast";
import { queueOfflineUndoOp } from "@/lib/undo/offline";

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `undo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function logUndoAudit(input: {
  action: "UNDO" | "REDO" | "ACTION";
  module: UndoModule;
  kind: UndoActionKind;
  label: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queueOfflineUndoOp({
        type: "audit",
        payload: input,
        createdAt: Date.now(),
      });
      return;
    }
    await fetch("/api/undo/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    /* never block UX */
  }
}

export type PushUndoableInput = {
  module: UndoModule;
  kind: UndoActionKind;
  label: string;
  /** English toast title preferred, e.g. "Product deleted" */
  title?: string;
  message?: string;
  undoLabel?: string;
  durationMs?: number;
  showToast?: boolean;
  /** If true, toast has no Undo (e.g. password confirmation) */
  toastOnly?: boolean;
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
  commit?: () => void | Promise<void>;
  meta?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  /** Skip audit trail (high-frequency form keystrokes) */
  skipAudit?: boolean;
};

/**
 * Register an undoable action, show toast, schedule 30s commit window.
 */
export function pushUndoable(input: PushUndoableInput): string {
  const owner = undoStore.getOwner();
  const id = newId();
  const now = Date.now();
  const durationMs = input.durationMs ?? UNDO_WINDOW_MS;

  const entry: UndoEntry = {
    id,
    userId: owner.userId,
    companyId: owner.companyId,
    module: input.module,
    kind: input.kind,
    label: input.label,
    createdAt: now,
    expiresAt: now + durationMs,
    status: "active",
    undo: input.undo,
    redo: input.redo,
    commit: input.commit,
    meta: {
      ...input.meta,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  };

  if (!input.toastOnly) {
    undoStore.push(entry);
  }

  if (!input.skipAudit) {
    void logUndoAudit({
      action: "ACTION",
      module: input.module,
      kind: input.kind,
      label: input.label,
      entityType: input.entityType,
      entityId: input.entityId,
      meta: input.meta,
    });
  }

  if (input.showToast !== false) {
    const title = input.title || input.label;
    if (input.toastOnly || input.kind === "password") {
      appToast.success(title, input.message);
    } else {
      appToast.actionWithUndo({
        title,
        message: input.message,
        undoLabel: input.undoLabel || "Undo",
        durationMs,
        onUndo: async () => {
          try {
            const undone = await undoStore.undoExact(id);
            if (!undone) {
              await input.undo();
            }
            void logUndoAudit({
              action: "UNDO",
              module: input.module,
              kind: input.kind,
              label: input.label,
              entityType: input.entityType,
              entityId: input.entityId,
            });
            appToast.info("Undone", "Action restored.");
          } catch {
            appToast.error("Unable to restore action.", "Try again.");
            throw new Error("undo failed");
          }
        },
      });
    }
  }

  return id;
}

export async function performUndo(module?: UndoModule) {
  try {
    const entry = await undoStore.undo(module);
    if (!entry) return false;
    void logUndoAudit({
      action: "UNDO",
      module: entry.module,
      kind: entry.kind,
      label: entry.label,
      entityType: entry.meta?.entityType as string | undefined,
      entityId: entry.meta?.entityId as string | undefined,
    });
    appToast.info("Undone", entry.label);
    return true;
  } catch {
    appToast.error("Unable to restore action.", "Try again.");
    return false;
  }
}

export async function performRedo(module?: UndoModule) {
  try {
    const entry = await undoStore.redo(module);
    if (!entry) return false;
    void logUndoAudit({
      action: "REDO",
      module: entry.module,
      kind: entry.kind,
      label: entry.label,
      entityType: entry.meta?.entityType as string | undefined,
      entityId: entry.meta?.entityId as string | undefined,
    });
    appToast.info("Redone", entry.label);
    // Re-show undo toast for the redone action
    appToast.actionWithUndo({
      title: entry.label,
      undoLabel: "Undo",
      durationMs: UNDO_WINDOW_MS,
      onUndo: async () => {
        await performUndo(entry.module);
      },
    });
    return true;
  } catch {
    appToast.error("Unable to restore action.", "Try again.");
    return false;
  }
}
