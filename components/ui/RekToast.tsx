"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Package,
  ShoppingBasket,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  Settings,
  Printer,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/i18n/LocaleProvider";

export type ToastTone = "success" | "error" | "info" | "warning";

export type ToastPreset =
  | "productSaved"
  | "saleCompleted"
  | "purchaseCompleted"
  | "invoicePrinted"
  | "customerCreated"
  | "supplierAdded"
  | "warehouseUpdated"
  | "settingsSaved"
  | "generic";

const PRESET_ICONS: Record<ToastPreset, LucideIcon> = {
  productSaved: Package,
  saleCompleted: ShoppingCart,
  purchaseCompleted: ShoppingBasket,
  invoicePrinted: Printer,
  customerCreated: Users,
  supplierAdded: Truck,
  warehouseUpdated: Warehouse,
  settingsSaved: Settings,
  generic: CheckCircle2,
};

const TONE_ICONS: Record<ToastTone, LucideIcon> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
  warning: AlertTriangle,
};

type RekToastProps = {
  id: string | number;
  title: string;
  message?: string;
  tone?: ToastTone;
  preset?: ToastPreset;
};

export default function RekToast({
  id,
  title,
  message,
  tone = "success",
  preset = "generic",
}: RekToastProps) {
  const { t } = useT();
  const Icon =
    preset !== "generic" ? PRESET_ICONS[preset] : TONE_ICONS[tone];

  return (
    <div
      className={`rek-toast rek-toast-${tone}`}
      role="status"
      aria-live="polite"
    >
      <div className="rek-toast-glow" aria-hidden />
      <div className="rek-toast-icon">
        <Icon size={20} strokeWidth={2.4} />
      </div>
      <div className="rek-toast-body">
        <p className="rek-toast-title">{title}</p>
        {message ? <p className="rek-toast-message">{message}</p> : null}
      </div>
      <button
        type="button"
        className="rek-toast-close"
        aria-label={t("toast.close")}
        onClick={() => toast.dismiss(id)}
      >
        <X size={16} />
      </button>
      <span className="rek-toast-progress" aria-hidden />
    </div>
  );
}
