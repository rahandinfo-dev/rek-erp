"use client";

import { toast } from "sonner";
import RekToast, {
  type ToastPreset,
  type ToastTone,
} from "@/components/ui/RekToast";
import UndoToast from "@/components/ui/UndoToast";

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
          undoLabel={input.undoLabel || "پاشگەزبوونەوە"}
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
  productSaved(message = "بەرهەم بە سەرکەوتوویی پاشەکەوتکرا.") {
    return showToast({
      title: "بەرهەم پاشەکەوتکرا",
      message,
      preset: "productSaved",
    });
  },
  saleCompleted(message = "فرۆشتن بە سەرکەوتوویی تۆمارکرا.") {
    return showToast({
      title: "فرۆشتن تەواوکرا",
      message,
      preset: "saleCompleted",
    });
  },
  purchaseCompleted(message = "کڕین بە سەرکەوتوویی تۆمارکرا.") {
    return showToast({
      title: "کڕین تەواوکرا",
      message,
      preset: "purchaseCompleted",
    });
  },
  invoicePrinted(message = "پسوولە چاپکرا.") {
    return showToast({
      title: "پسوولە چاپکرا",
      message,
      preset: "invoicePrinted",
    });
  },
  customerCreated(message = "کڕیار بە سەرکەوتوویی زیادکرا.") {
    return showToast({
      title: "کڕیار دروستکرا",
      message,
      preset: "customerCreated",
    });
  },
  supplierAdded(message = "دابینکەر بە سەرکەوتوویی زیادکرا.") {
    return showToast({
      title: "دابینکەر زیادکرا",
      message,
      preset: "supplierAdded",
    });
  },
  warehouseUpdated(message = "کۆگا بە سەرکەوتوویی نوێکرایەوە.") {
    return showToast({
      title: "کۆگا نوێکرایەوە",
      message,
      preset: "warehouseUpdated",
    });
  },
  settingsSaved(message = "ڕێکخستنەکان پاشەکەوتکران.") {
    return showToast({
      title: "ڕێکخستن پاشەکەوتکرا",
      message,
      preset: "settingsSaved",
    });
  },
  pdfGenerated(message = "PDF دروستکرا.") {
    return showToast({
      title: "PDF دروستکرا",
      message,
      tone: "success",
      preset: "invoicePrinted",
    });
  },
  salaryAlert(message: string, title = "ئاگاداری مووچە") {
    return showToast({
      title,
      message,
      tone: "warning",
      duration: 5000,
    });
  },
  stockLow(message: string, title = "کۆگای کەم") {
    return showToast({
      title,
      message,
      tone: "warning",
      duration: 5200,
    });
  },
  stockOut(message: string, title = "کۆگا تەواو بوو") {
    return showToast({
      title,
      message,
      tone: "error",
      duration: 5600,
    });
  },
  warehouseStockLow(message: string, title = "کۆگا — کۆگای کەم") {
    return showToast({
      title,
      message,
      tone: "warning",
      duration: 5400,
    });
  },
  inventoryAdjusted(message: string, title = "ڕێکخستنی کۆگا") {
    return showToast({
      title,
      message,
      tone: "info",
      duration: 4800,
    });
  },
  warehouseTransfer(message: string, title = "گواستنەوەی کۆگا") {
    return showToast({
      title,
      message,
      tone: "info",
      duration: 4800,
    });
  },
  largeSale(message: string, title = "فرۆشتنی گەورە") {
    return showToast({
      title,
      message,
      tone: "warning",
      duration: 5200,
    });
  },
  largePurchase(message: string, title = "کڕینی گەورە") {
    return showToast({
      title,
      message,
      tone: "warning",
      duration: 5200,
    });
  },
};
