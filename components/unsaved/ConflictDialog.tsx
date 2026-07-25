"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";
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
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-[var(--overlay)] backdrop-blur-[2px]" />
        <AlertDialog.Content className="rek-dialog fixed top-1/2 left-1/2 z-[101] w-[95%] max-w-lg -translate-x-1/2 -translate-y-1/2 p-6">
          <AlertDialog.Title className="text-xl font-bold">
            Version Conflict
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-muted-foreground">
            Another device modified “{conflict?.label || "this record"}”. Choose
            how to resolve.
          </AlertDialog.Description>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button type="button" onClick={onKeepMine}>
              Keep Mine
            </Button>
            <Button type="button" variant="outline" onClick={onKeepTheirs}>
              Keep Theirs
            </Button>
            <Button type="button" variant="outline" onClick={onMerge}>
              Merge Changes
            </Button>
            <Button type="button" variant="outline" onClick={onCompare}>
              Compare Versions
            </Button>
          </div>
          <div className="mt-4 flex justify-end">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
