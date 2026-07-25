/** Enterprise Undo / Redo — shared types */

export const UNDO_WINDOW_MS = 30_000;
export const UNDO_STACK_LIMIT = 40;

export const UNDO_MODULES = [
  "products",
  "inventory",
  "warehouses",
  "barcode",
  "sales",
  "purchases",
  "invoices",
  "customers",
  "suppliers",
  "employees",
  "reports",
  "settings",
  "calculator",
  "notifications",
  "drafts",
  "brands",
  "categories",
  "units",
  "general",
] as const;

export type UndoModule = (typeof UNDO_MODULES)[number] | string;

export type UndoActionKind =
  | "create"
  | "edit"
  | "delete"
  | "archive"
  | "restore"
  | "rename"
  | "move"
  | "duplicate"
  | "merge"
  | "split"
  | "status"
  | "warehouse"
  | "price"
  | "cost"
  | "discount"
  | "tax"
  | "quantity"
  | "image"
  | "notes"
  | "assignment"
  | "settings"
  | "password"
  | "cancel"
  | "void"
  | "other";

export type UndoEntryStatus =
  | "active"
  | "undone"
  | "redone"
  | "committed"
  | "expired";

/**
 * Runtime undo entry. Handlers stay in memory; serializable meta
 * is mirrored offline for reconnect sync.
 */
export type UndoEntry = {
  id: string;
  userId: string;
  companyId: string;
  module: UndoModule;
  kind: UndoActionKind;
  label: string;
  createdAt: number;
  expiresAt: number;
  status: UndoEntryStatus;
  /** Reverse the forward action */
  undo: () => void | Promise<void>;
  /** Re-apply after undo */
  redo: () => void | Promise<void>;
  /** Optional permanent commit when the 30s window ends */
  commit?: () => void | Promise<void>;
  /** Offline / audit payload (no secrets) */
  meta?: Record<string, unknown>;
};

export type UndoSerializable = {
  id: string;
  userId: string;
  companyId: string;
  module: UndoModule;
  kind: UndoActionKind;
  label: string;
  createdAt: number;
  expiresAt: number;
  status: UndoEntryStatus;
  /** Remote ops queued while offline */
  undoUrl?: string;
  undoMethod?: string;
  redoUrl?: string;
  redoMethod?: string;
  commitUrl?: string;
  commitMethod?: string;
  meta?: Record<string, unknown>;
};

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  if (target.closest("[contenteditable='true']")) return true;
  if (target.closest("[data-native-undo]")) return true;
  return false;
}
