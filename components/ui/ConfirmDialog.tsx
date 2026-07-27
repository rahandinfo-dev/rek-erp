"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useT();
  const resolvedConfirm = confirmText ?? t("common.delete");
  const resolvedCancel = cancelText ?? t("common.cancel");

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[2px] animate-in fade-in duration-200" />

        <AlertDialog.Content className="rek-dialog fixed top-1/2 left-1/2 z-50 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 p-6 animate-in fade-in zoom-in-95 duration-200">
          <AlertDialog.Title className="text-2xl font-bold text-foreground">
            {title}
          </AlertDialog.Title>

          <AlertDialog.Description className="mt-3 text-muted-foreground">
            {description}
          </AlertDialog.Description>

          <div className="mt-8 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="outline">
                {resolvedCancel}
              </Button>
            </AlertDialog.Cancel>

            <Button
              type="button"
              variant="destructive"
              disabled={loading}
              onClick={onConfirm}
            >
              {loading ? t("common.pleaseWait") : resolvedConfirm}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
