"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MODULE_LABELS,
  formatBytes,
  relativeTime,
  type SessionRecord,
} from "@/lib/recovery/types";

type Props = {
  open: boolean;
  session: SessionRecord | null;
  onClose: () => void;
  onContinue: () => void;
};

export default function SessionDetailsDialog({
  open,
  session,
  onClose,
  onContinue,
}: Props) {
  if (!session) return null;
  const s = session.summary;
  const label =
    session.title || s.moduleLabel || MODULE_LABELS[session.moduleKey];

  const bullets: string[] = [];
  if (s.fieldsChanged)
    bullets.push(
      `${s.fieldsChanged} field${s.fieldsChanged === 1 ? "" : "s"} changed`
    );
  if (s.hasWarehouse) bullets.push("Warehouse selected");
  if (s.hasCustomer) bullets.push("Customer selected");
  if (s.hasSupplier) bullets.push("Supplier selected");
  if (s.hasEmployee) bullets.push("Employee selected");
  if (s.hasImage) bullets.push("Image uploaded");
  if (s.itemCount) bullets.push(`${s.itemCount} line item(s)`);
  bullets.push(...(s.notes || []));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session Details</DialogTitle>
          <DialogDescription>
            Snapshot of unfinished work ready to restore.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            <span className="font-bold text-foreground">Module:</span> {label}
          </p>
          <p>
            <span className="font-bold text-foreground">Last edited:</span>{" "}
            {relativeTime(session.lastEditedAt)}
          </p>
          <p>
            <span className="font-bold text-foreground">Last saved:</span>{" "}
            {relativeTime(session.lastSavedAt)}
          </p>
          <p>
            <span className="font-bold text-foreground">Draft status:</span>{" "}
            {s.draftStatus}
          </p>
          <p>
            <span className="font-bold text-foreground">Size:</span>{" "}
            {formatBytes(session.sizeBytes)}
          </p>
          <p>
            <span className="font-bold text-foreground">
              Estimated recovery:
            </span>{" "}
            ~{Math.max(1, Math.round(s.estimatedMs / 1000))}s
          </p>
          {bullets.length ? (
            <ul className="list-disc space-y-1 ps-5 text-muted-foreground">
              {bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Path: {session.pathname}
            {session.search}
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            Continue Editing
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-card px-5 text-sm font-bold text-foreground"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
