"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";
import { CompactAlertDialogContent } from "@/components/ui/CompactAlertDialog";
import type { ConflictPayload } from "@/lib/unsaved/types";

type Props = {
  conflict: ConflictPayload | null;
  onKeepMine: () => void;
  onKeepTheirs: () => void;
  onMerge: () => void;
  onCompare: () => void;
  onCancel: () => void;
};

export default function ConflictDialog({
  conflict,
  onKeepMine,
  onKeepTheirs,
  onMerge,
  onCompare,
  onCancel,
}: Props) {
  const open = Boolean(conflict);
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel();
      }}
    >
      <CompactAlertDialogContent>
          <AlertDialog.Title className="text-xl font-bold">
            پێکدادانی وەشان
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-muted-foreground">
            ئامێرێکی تر “{conflict?.label || "ئەم تۆمارە"}”ی دەستکاری کرد. چۆن
            چارەسەری بکەیت؟
          </AlertDialog.Description>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button type="button" onClick={onKeepMine}>
              هی من بهێڵەوە
            </Button>
            <Button type="button" variant="outline" onClick={onKeepTheirs}>
              هی ئەوان بهێڵەوە
            </Button>
            <Button type="button" variant="outline" onClick={onMerge}>
              تێکەڵکردنی گۆڕانکارییەکان
            </Button>
            <Button type="button" variant="outline" onClick={onCompare}>
              بەراوردکردنی وەشانەکان
            </Button>
          </div>
          <div className="mt-4 flex justify-end">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="ghost" onClick={onCancel}>
                هەڵوەشاندنەوە
              </Button>
            </AlertDialog.Cancel>
          </div>
      </CompactAlertDialogContent>
    </AlertDialog.Root>
  );
}
