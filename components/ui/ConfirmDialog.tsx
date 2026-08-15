"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";
import { CompactAlertDialogContent } from "@/components/ui/CompactAlertDialog";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => unknown;
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
      <CompactAlertDialogContent className="animate-in fade-in zoom-in-95 duration-200">
          <AlertDialog.Title className="text-xl font-bold text-foreground">
            {title}
          </AlertDialog.Title>

          <AlertDialog.Description className="mt-3 text-muted-foreground">
            {description}
          </AlertDialog.Description>

          <div dir="ltr" className="mt-6 grid grid-cols-2 gap-3">
            <AlertDialog.Cancel asChild>
              <Button type="button" dir="rtl" variant="outline" className="w-full">
                {resolvedCancel}
              </Button>
            </AlertDialog.Cancel>

            <AlertDialog.Action asChild>
              <button
                type="button"
                dir="rtl"
                disabled={loading}
                onClick={(event) => {
                  event.preventDefault();
                  void onConfirm();
                }}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-transparent bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? t("common.pleaseWait") : resolvedConfirm}
              </button>
            </AlertDialog.Action>
          </div>
      </CompactAlertDialogContent>
    </AlertDialog.Root>
  );
}
