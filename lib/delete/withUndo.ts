"use client";

import { pushUndoable } from "@/lib/undo/push";
import { UNDO_WINDOW_MS } from "@/lib/undo/types";
import type { UndoModule } from "@/lib/undo/types";
import { queueOfflineUndoOp } from "@/lib/undo/offline";
import { appToast } from "@/lib/toast";

export const DEFAULT_UNDO_MS = UNDO_WINDOW_MS;

type SoftDeleteWithUndoInput = {
  deleteUrl: string;
  restoreUrl: string;
  module?: UndoModule;
  title?: string;
  message?: string;
  undoLabel?: string;
  durationMs?: number;
  entityType?: string;
  entityId?: string;
  onSoftDeleted?: () => void;
  onRestored?: () => void;
  /** Called when undo window expires (soft-delete stays). */
  onCommitted?: () => void;
};

async function httpDelete(url: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    queueOfflineUndoOp({
      type: "http",
      payload: null,
      url,
      method: "DELETE",
      createdAt: Date.now(),
    });
    return { ok: true, message: "Queued offline" };
  }
  const res = await fetch(url, { method: "DELETE" });
  const json = (await res.json()) as { success?: boolean; message?: string };
  return {
    ok: res.ok && json.success !== false,
    message: json.message,
  };
}

async function httpRestore(url: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    queueOfflineUndoOp({
      type: "http",
      payload: null,
      url,
      method: "POST",
      createdAt: Date.now(),
    });
    return { ok: true, message: "Queued offline" };
  }
  const res = await fetch(url, { method: "POST" });
  const json = (await res.json()) as { success?: boolean; message?: string };
  return {
    ok: res.ok && json.success !== false,
    message: json.message,
  };
}

/**
 * Soft-delete → Undo toast (30s) → restore on Undo / Redo support.
 * Data is never hard-deleted in this window.
 */
export async function softDeleteWithUndo(
  input: SoftDeleteWithUndoInput
): Promise<{ ok: boolean; message?: string }> {
  const durationMs = input.durationMs ?? DEFAULT_UNDO_MS;
  const undoModule = input.module || "general";

  try {
    const deleted = await httpDelete(input.deleteUrl);
    if (!deleted.ok) {
      appToast.error(deleted.message || "سڕینەوە سەرنەکەوت.");
      return { ok: false, message: deleted.message };
    }

    input.onSoftDeleted?.();

    let softDeleted = true;

    pushUndoable({
      module: undoModule,
      kind: "delete",
      label: input.title || "Item deleted",
      title: input.title || "Item deleted",
      message:
        input.message ||
        deleted.message ||
        "Moved to recovery — Undo available for 30 seconds.",
      undoLabel: input.undoLabel || "پاشگەزبوونەوە",
      durationMs,
      entityType: input.entityType,
      entityId: input.entityId,
      undo: async () => {
        if (!softDeleted) return;
        const restored = await httpRestore(input.restoreUrl);
        if (!restored.ok) {
          throw new Error(restored.message || "restore failed");
        }
        softDeleted = false;
        input.onRestored?.();
      },
      redo: async () => {
        if (softDeleted) return;
        const again = await httpDelete(input.deleteUrl);
        if (!again.ok) throw new Error(again.message || "redo delete failed");
        softDeleted = true;
        input.onSoftDeleted?.();
      },
      commit: async () => {
        // Soft-delete remains — permanent hard-purge is a separate action.
        input.onCommitted?.();
      },
    });

    return { ok: true, message: deleted.message };
  } catch {
    appToast.error("نەتوانرا کردارەکە تەواو بکرێت.", "دووبارە هەوڵبدەرەوە.");
    return { ok: false };
  }
}

export { UNDO_WINDOW_MS };
