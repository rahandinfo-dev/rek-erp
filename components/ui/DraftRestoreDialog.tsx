"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { CompactAlertDialogContent } from "@/components/ui/CompactAlertDialog";
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
    <AlertDialog.Root open={open} onOpenChange={() => undefined}>
      <CompactAlertDialogContent>
        <AlertDialog.Title className="text-xl font-bold text-foreground">
          گۆڕانکاری پاشەکەوتنەکراو دۆزرایەوە
        </AlertDialog.Title>
        <AlertDialog.Description className="mt-3 leading-7 text-muted-foreground">
            گۆڕانکاری پاشەکەوتنەکراو لە دانیشتنی پێشووتان دۆزرایەوە
            {when ? ` (${when})` : ""}. دەتەوێت لەو شوێنەوە بەردەوام بیت؟
        </AlertDialog.Description>
        <div dir="ltr" className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            dir="rtl"
            onClick={onDiscard}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground"
          >
            تەواونەکراو
          </button>
          <button
            type="button"
            dir="rtl"
            onClick={onContinue}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            بەردەوامبوون لە دەستکاری
          </button>
        </div>
      </CompactAlertDialogContent>
    </AlertDialog.Root>
  );
}
