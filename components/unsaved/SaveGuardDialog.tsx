"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";
import { CompactAlertDialogContent } from "@/components/ui/CompactAlertDialog";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  open: boolean;
  summary: string[];
  saving?: boolean;
  onSaveContinue: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export default function SaveGuardDialog({
  open,
  summary,
  saving = false,
  onSaveContinue,
  onDiscard,
  onCancel,
}: Props) {
  const { t } = useT();
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onCancel();
      }}
    >
      <CompactAlertDialogContent
          className="animate-in fade-in zoom-in-95 duration-200"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            onCancel();
          }}
        >
          <AlertDialog.Title className="text-2xl font-bold text-foreground">
            {t("unsaved.unsavedTitle")}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-muted-foreground">
            {t("unsaved.unsavedBody")}
          </AlertDialog.Description>

          {summary.length ? (
            <ul className="mt-4 max-h-36 space-y-1 overflow-y-auto rounded-xl bg-muted/60 px-3 py-2 text-sm text-foreground">
              {summary.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-amber-600" aria-hidden>
                    ●
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={onCancel}
              >
                {t("common.cancel")}
              </Button>
            </AlertDialog.Cancel>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              className="text-destructive hover:text-destructive"
              onClick={onDiscard}
            >
              {t("unsaved.discard")}
            </Button>
            <Button type="button" disabled={saving} onClick={onSaveContinue}>
              {saving ? t("common.saving") : t("unsaved.saveContinue")}
            </Button>
          </div>
      </CompactAlertDialogContent>
    </AlertDialog.Root>
  );
}
