"use client";

import { useEffect, useState } from "react";
import { Eye, Play, Trash2, Pencil } from "lucide-react";
import { useSessionRecovery } from "@/lib/recovery/provider";
import {
  MODULE_LABELS,
  formatBytes,
  relativeTime,
  type SessionRecord,
} from "@/lib/recovery/types";
import SessionDetailsDialog from "@/components/recovery/SessionDetailsDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ConnectionStatusBadge from "@/components/recovery/ConnectionStatus";

export default function RecoveryCenter() {
  const {
    sessions,
    connection,
    refreshSessions,
    restoreSession,
    discardSession,
    discardAll,
    renameSession,
  } = useSessionRecovery();

  const [details, setDetails] = useState<SessionRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">
            Recovery Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Unfinished sessions saved automatically — continue exactly where you
            left off.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConnectionStatusBadge status={connection} />
          {sessions.length > 0 ? (
            <button
              type="button"
              onClick={() => setConfirmAll(true)}
              className="inline-flex h-10 items-center rounded-xl border border-destructive/30 px-4 text-sm font-bold text-destructive"
            >
              Delete All
            </button>
          ) : null}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
          No unfinished sessions. Keep working — recovery snapshots appear here
          automatically.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s) => {
            const label =
              s.title || s.summary.moduleLabel || MODULE_LABELS[s.moduleKey];
            const progress =
              s.summary.draftStatus === "draft"
                ? 85
                : s.summary.draftStatus === "partial"
                  ? 45
                  : 15;

            return (
              <article
                key={s.moduleKey}
                className="flex flex-col rounded-3xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-black text-foreground">
                      {label}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {s.moduleKey}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {s.summary.draftStatus}
                  </span>
                </div>

                <dl className="mb-4 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>Created</dt>
                    <dd className="font-semibold text-foreground">
                      {relativeTime(s.createdAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Last edited</dt>
                    <dd className="font-semibold text-foreground">
                      {relativeTime(s.lastEditedAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Size</dt>
                    <dd className="font-semibold text-foreground">
                      {formatBytes(s.sizeBytes)}
                    </dd>
                  </div>
                </dl>

                <div className="mb-4">
                  <div className="mb-1 flex justify-between text-[10px] font-bold text-muted-foreground">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {renaming === s.moduleKey ? (
                  <form
                    className="mb-3 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void renameSession(s.moduleKey, renameValue.trim());
                      setRenaming(null);
                    }}
                  >
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="h-9 flex-1 rounded-xl border border-border bg-background px-3 text-sm"
                      placeholder="Rename session"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="h-9 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground"
                    >
                      Save
                    </button>
                  </form>
                ) : null}

                <div className="mt-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void restoreSession(s)}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground"
                  >
                    <Play size={14} />
                    Continue
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetails(s);
                      setDetailsOpen(true);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-border px-3 text-sm font-bold"
                    title="Preview"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming(s.moduleKey);
                      setRenameValue(s.title || label);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-border px-3 text-sm font-bold"
                    title="Rename"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteKey(s.moduleKey)}
                    className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-destructive/30 px-3 text-sm font-bold text-destructive"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <SessionDetailsDialog
        open={detailsOpen}
        session={details}
        onClose={() => setDetailsOpen(false)}
        onContinue={() => {
          if (details) void restoreSession(details);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteKey)}
        title="Delete Session"
        description="Remove this recovery snapshot? Form drafts for the module may remain until discarded separately."
        confirmText="Delete"
        onCancel={() => setDeleteKey(null)}
        onConfirm={async () => {
          if (deleteKey) await discardSession(deleteKey);
          setDeleteKey(null);
        }}
      />

      <ConfirmDialog
        open={confirmAll}
        title="Delete All Sessions"
        description="Remove every unfinished recovery snapshot for your account?"
        confirmText="Delete All"
        onCancel={() => setConfirmAll(false)}
        onConfirm={async () => {
          await discardAll();
          setConfirmAll(false);
        }}
      />
    </div>
  );
}
