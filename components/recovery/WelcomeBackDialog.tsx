"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { CompactAlertDialogContent } from "@/components/ui/CompactAlertDialog";
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
    "دانیشتن";

  return (
    <AlertDialog.Root open={open} onOpenChange={() => undefined}>
      <CompactAlertDialogContent>
        <AlertDialog.Title className="text-xl font-bold text-foreground">
          بەخێربێیتەوە
        </AlertDialog.Title>
        <AlertDialog.Description className="mt-3 leading-7 text-muted-foreground">
            دانیشتنێکی تەواونەبوو لە سەردانەکەی پێشووتان دۆزرایەوە
            {session
              ? ` (${label} · دەستکاری ${relativeTime(session.lastEditedAt)})`
              : ""}
            . دەتەوێت لەو شوێنەوە بەردەوام بیت؟
        </AlertDialog.Description>
        <div
          dir="ltr"
          className="mt-6 flex flex-wrap gap-3"
        >
          <button
            type="button"
            dir="rtl"
            onClick={onDiscard}
            className="inline-flex h-11 flex-1 basis-[45%] items-center justify-center rounded-xl border border-border bg-transparent px-4 text-sm font-bold text-muted-foreground"
          >
            فڕێدانی دانیشتن
          </button>
          <button
            type="button"
            dir="rtl"
            onClick={onViewDetails}
            className="inline-flex h-11 flex-1 basis-[45%] items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground"
          >
            بینینی وردەکاری دانیشتن
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
