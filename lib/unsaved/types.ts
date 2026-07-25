/** Enterprise dirty-state machine for save guard */

export type DirtyState =
  | "clean"
  | "modified"
  | "saving"
  | "saved"
  | "error";

export type SaveGuardSource = {
  id: string;
  label: string;
  moduleKey?: string;
  pathname?: string;
  state: DirtyState;
  savedAt: number | null;
  changeSummary: string[];
  /** Optional server/entity revision for conflict detection */
  baseRevision?: string | number | null;
  /** Persist draft / entity (return false on failure) */
  save: () => Promise<boolean>;
  /** Discard local edits (restore baseline / clear draft) */
  discard: () => Promise<void> | void;
  /** Snapshot used for discard-undo (30s) */
  snapshot?: unknown;
};

export type SaveHistoryEntry = {
  id: string;
  sourceId: string;
  label: string;
  savedAt: number;
  durationMs: number;
  device: string;
  ok: boolean;
};

export type DiscardUndoEntry = {
  id: string;
  sourceId: string;
  label: string;
  snapshot: unknown;
  expiresAt: number;
  restore: () => void;
};

export type ConflictPayload = {
  sourceId: string;
  label: string;
  mine: unknown;
  theirs: unknown;
  mineSavedAt?: number;
  theirsSavedAt?: number;
};

export type SaveGuardPrefs = {
  version: 1;
  userId: string;
  companyId: string;
  autoSaveEnabled: boolean;
  /** 5000 | 10000 | 30000 | 60000 */
  autoSaveDelayMs: 5000 | 10000 | 30000 | 60000;
  updatedAt: number;
};

export const AUTO_SAVE_DELAYS = [
  { ms: 5000 as const, label: "5 Seconds" },
  { ms: 10000 as const, label: "10 Seconds" },
  { ms: 30000 as const, label: "30 Seconds" },
  { ms: 60000 as const, label: "1 Minute" },
];

export const RETRY_DELAYS_MS = [2000, 5000, 10000] as const;

export const DISCARD_UNDO_MS = 30_000;

export function emptySaveGuardPrefs(
  userId: string,
  companyId: string
): SaveGuardPrefs {
  return {
    version: 1,
    userId,
    companyId,
    autoSaveEnabled: true,
    autoSaveDelayMs: 5000,
    updatedAt: Date.now(),
  };
}

export function mapDraftStatusToDirty(
  status: string,
  hasUnsaved: boolean
): DirtyState {
  if (status === "saving") return "saving";
  if (status === "failed") return "error";
  if (
    status === "unsaved" ||
    status === "offline" ||
    status === "waiting" ||
    hasUnsaved
  ) {
    return "modified";
  }
  if (status === "saved" || status === "restored") return "saved";
  return "clean";
}

export function deviceLabel() {
  if (typeof navigator === "undefined") return "Server";
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone/i.test(ua)) return "Mobile";
  if (/Macintosh|Mac OS/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Browser";
}
