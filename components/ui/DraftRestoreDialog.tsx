"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils/datetime";

type Props = {
  open: boolean;
  savedAt?: number | null;
  onContinue: () => void;
  onDiscard: () => void;
};

function formatWhen(savedAt?: number | null) {
  return formatDateTime(savedAt);
}

export default function DraftRestoreDialog({
  open,
  savedAt,
  onContinue,
  onDiscard,
}: Props) {
  const when = formatWhen(savedAt);

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>گۆڕانکاری پاشەکەوتنەکراو دۆزرایەوە</DialogTitle>
          <DialogDescription>
            گۆڕانکاری پاشەکەوتنەکراو لە دانیشتنی پێشووتان دۆزرایەوە
            {when ? ` (${when})` : ""}. دەتەوێت لەو شوێنەوە بەردەوام بیت؟
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            بەردەوامبوون لە دەستکاری
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-card px-5 text-sm font-bold text-foreground"
          >
            فڕێدانی ڕەشنووس
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
