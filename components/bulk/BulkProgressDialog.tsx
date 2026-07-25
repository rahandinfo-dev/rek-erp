"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";
import type { BulkJobSummary } from "@/lib/bulk/types";
import {
  BULK_ACTION_LABELS,
  BULK_MODULE_LABELS,
} from "@/lib/bulk/types";

type Props = {
  open: boolean;
  job: BulkJobSummary | null;
  onCancelRemaining: () => void;
  onClose: () => void;
  onUndo?: () => void;
  undoing?: boolean;
};

export default function BulkProgressDialog({
  open,
  job,
  onCancelRemaining,
  onClose,
  onUndo,
  undoing,
}: Props) {
  if (!job) return null;

  const pct =
    job.totalCount === 0
      ? 0
      : Math.round((job.processedCount / job.totalCount) * 100);
  const done = ["completed", "failed", "cancelled", "partial"].includes(
    job.status
  );

  return (
    <AlertDialog.Root open={open} onOpenChange={(v) => !v && done && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[2px]" />
        <AlertDialog.Content className="rek-dialog fixed top-1/2 left-1/2 z-50 w-[95%] max-w-lg -translate-x-1/2 -translate-y-1/2 p-6">
          <AlertDialog.Title className="text-xl font-black">
            {done ? "Bulk operation summary" : "Processing bulk action…"}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            {BULK_ACTION_LABELS[job.action] || job.action} ·{" "}
            {BULK_MODULE_LABELS[job.moduleKey] || job.moduleKey}
          </AlertDialog.Description>

          <div className="mt-5 space-y-3" aria-live="polite">
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="text-sm font-bold text-foreground">
              {job.processedCount} / {job.totalCount} · {pct}% · {job.status}
            </p>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <Stat label="Completed" value={job.successCount} />
              <Stat label="Failed" value={job.failedCount} />
              <Stat label="Skipped" value={job.skippedCount} />
              <Stat label="Cancelled" value={job.cancelledCount} />
            </dl>
            {job.items && job.items.length > 0 && (
              <ul className="max-h-40 overflow-auto rounded-xl border border-border text-xs">
                {job.items.slice(0, 40).map((i) => (
                  <li
                    key={i.id}
                    className="flex justify-between gap-2 border-b border-border px-3 py-2 last:border-0"
                  >
                    <span className="truncate font-medium">
                      {i.entityLabel || i.entityId}
                    </span>
                    <span className="shrink-0 capitalize text-muted-foreground">
                      {i.status}
                      {i.message ? ` · ${i.message}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {!done && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancelRemaining}
                className="focus-visible:ring-[3px] focus-visible:ring-ring/35"
              >
                Cancel Remaining
              </Button>
            )}
            {done && job.canUndo && onUndo && (
              <Button
                type="button"
                variant="outline"
                disabled={undoing}
                onClick={onUndo}
              >
                {undoing ? "Undoing…" : "Undo"}
              </Button>
            )}
            {done && (
              <Button type="button" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-black">{value}</dd>
    </div>
  );
}
