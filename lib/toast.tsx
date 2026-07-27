"use client";

import { toast } from "sonner";
import RekToast, {
  type ToastPreset,
  type ToastTone,
} from "@/components/ui/RekToast";
import UndoToast from "@/components/ui/UndoToast";
import { tServer } from "@/lib/i18n";

const t = tServer.t.bind(tServer);

type ShowToastInput = {
  title: string;
  message?: string;
  tone?: ToastTone;
  preset?: ToastPreset;
  duration?: number;
};

export function showToast({
  title,
  message,
  tone = "success",
  preset = "generic",
  duration = 3800,
}: ShowToastInput) {
  return toast.custom(
    (id) => (
      <RekToast
        id={id}
        title={title}
        message={message}
        tone={tone}
        preset={preset}
      />
    ),
    {
      duration,
      unstyled: true,
    }
  );
}

export const appToast = {
  success(title: string, message?: string) {
    return showToast({ title, message, tone: "success" });
  },
  error(title: string, message?: string) {
    return showToast({ title, message, tone: "error", duration: 4500 });
  },
  info(title: string, message?: string) {
    return showToast({ title, message, tone: "info" });
  },
  warning(title: string, message?: string) {
    return showToast({ title, message, tone: "warning", duration: 4200 });
  },
  /** Enterprise action toast with Undo (30s default). */
  actionWithUndo(input: {
    title: string;
    message?: string;
    undoLabel?: string;
    durationMs?: number;
    onUndo: () => void | Promise<void>;
  }) {
    const durationMs = input.durationMs ?? 30_000;
    return toast.custom(
      (id) => (
        <UndoToast
          id={id}
          title={input.title}
          message={input.message}
          undoLabel={input.undoLabel || t("toast.undo")}
          durationMs={durationMs}
          onUndo={input.onUndo}
        />
      ),
      {
        duration: durationMs,
        unstyled: true,
      }
    );
  },
  /** Soft-delete toast with Undo — aliases actionWithUndo. */
  deletedWithUndo(input: {
    title: string;
    message?: string;
    undoLabel?: string;
    durationMs?: number;
    onUndo: () => void | Promise<void>;
  }) {
    return appToast.actionWithUndo(input);
  },
  productSaved(message = t("toast.productSavedBody")) {
    return showToast({
      title: t("toast.productSavedTitle"),
      message,
      preset: "productSaved",
    });
  },
  saleCompleted(message = t("toast.saleCompletedBody")) {
    return showToast({
      title: t("toast.saleCompletedTitle"),
      message,
      preset: "saleCompleted",
    });
  },
  purchaseCompleted(message = t("toast.purchaseCompletedBody")) {
    return showToast({
      title: t("toast.purchaseCompletedTitle"),
      message,
      preset: "purchaseCompleted",
    });
  },
  invoicePrinted(message = t("toast.invoicePrintedBody")) {
    return showToast({
      title: t("toast.invoicePrintedTitle"),
      message,
      preset: "invoicePrinted",
    });
  },
  customerCreated(message = t("toast.customerCreatedBody")) {
    return showToast({
      title: t("toast.customerCreatedTitle"),
      message,
      preset: "customerCreated",
    });
  },
  supplierAdded(message = t("toast.supplierAddedBody")) {
    return showToast({
      title: t("toast.supplierAddedTitle"),
      message,
      preset: "supplierAdded",
    });
  },
  warehouseUpdated(message = t("toast.warehouseUpdatedBody")) {
    return showToast({
      title: t("toast.warehouseUpdatedTitle"),
      message,
      preset: "warehouseUpdated",
    });
  },
  settingsSaved(message = t("toast.settingsSavedBody")) {
    return showToast({
      title: t("toast.settingsSavedTitle"),
      message,
      preset: "settingsSaved",
    });
  },
  pdfGenerated(message = t("toast.pdfGeneratedBody")) {
    return showToast({
      title: t("toast.pdfGeneratedTitle"),
      message,
      tone: "success",
      preset: "invoicePrinted",
    });
  },
  salaryAlert(message: string, title = t("toast.salaryAlertTitle")) {
    return showToast({
      title,
      message,
      tone: "warning",
      duration: 5000,
    });
  },
  stockLow(message: string, title = t("toast.stockLowTitle")) {
    return showToast({
      title,
      message,
      tone: "warning",
      duration: 5200,
    });
  },
  stockOut(message: string, title = t("toast.stockOutTitle")) {
    return showToast({
      title,
      message,
      tone: "error",
      duration: 5600,
    });
  },
  warehouseStockLow(
    message: string,
    title = t("toast.warehouseStockLowTitle")
  ) {
    return showToast({
      title,
      message,
      tone: "warning",
      duration: 5400,
    });
  },
  inventoryAdjusted(
    message: string,
    title = t("toast.inventoryAdjustedTitle")
  ) {
    return showToast({
      title,
      message,
      tone: "info",
      duration: 4800,
    });
  },
  warehouseTransfer(
    message: string,
    title = t("toast.warehouseTransferTitle")
  ) {
    return showToast({
      title,
      message,
      tone: "info",
      duration: 4800,
    });
  },
  largeSale(message: string, title = t("toast.largeSaleTitle")) {
    return showToast({
      title,
      message,
      tone: "warning",
      duration: 5200,
    });
  },
  largePurchase(message: string, title = t("toast.largePurchaseTitle")) {
    return showToast({
      title,
      message,
      tone: "warning",
      duration: 5200,
    });
  },
};
