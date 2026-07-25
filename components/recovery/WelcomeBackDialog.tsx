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
  relativeTime,
  type SessionRecord,
} from "@/lib/recovery/types";

type Props = {
  open: boolean;
  session: SessionRecord | null;
  onContinue: () => void;
  onDiscard: () => void;
  onViewDetails: () => void;
};

export default function WelcomeBackDialog({
  open,
  session,
  onContinue,
  onDiscard,
  onViewDetails,
}: Props) {
  const label =
    session?.title ||
    session?.summary.moduleLabel ||
    (session ? MODULE_LABELS[session.moduleKey] : "") ||
    "Session";

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome Back</DialogTitle>
          <DialogDescription>
            We found an unfinished session from your previous visit
            {session
              ? ` (${label} · edited ${relativeTime(session.lastEditedAt)})`
              : ""}
            . Would you like to continue where you left off?
          </DialogDescription>
        </DialogHeader>
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
            onClick={onViewDetails}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-card px-5 text-sm font-bold text-foreground"
          >
            View Session Details
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-transparent px-5 text-sm font-bold text-muted-foreground"
          >
            Discard Session
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
