"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import {
  hasNotificationBeenPrompted,
  markNotificationPrompted,
} from "@/lib/pwa/storage";
import {
  getRegistration,
  requestNotificationPermission,
  subscribeToPush,
} from "@/lib/pwa/client";
import { appToast } from "@/lib/toast";

const PERM_LABELS: Record<NotificationPermission, string> = {
  granted: "ڕێگەپێدراو",
  denied: "ڕەتکراوە",
  default: "پێشوەخت نەپرسراوە",
};

export function permissionLabelKu(perm: NotificationPermission): string {
  return PERM_LABELS[perm] || perm;
}

export default function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (hasNotificationBeenPrompted()) return;
    if (Notification.permission !== "default") {
      markNotificationPrompted();
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  function dismiss() {
    markNotificationPrompted();
    setVisible(false);
  }

  async function enable() {
    setBusy(true);
    try {
      const perm = await requestNotificationPermission();
      markNotificationPrompted();
      if (perm !== "granted") {
        if (perm === "denied") {
          appToast.error("ڕێگەی ئاگاداری ڕەتکرایەوە. لە ڕێکخستنەکان دەتوانیت دووبارە هەوڵ بدەیت.");
        }
        setVisible(false);
        return;
      }
      const reg = await getRegistration();
      if (reg) {
        await subscribeToPush(reg);
        await fetch("/api/pwa/prefs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: true }),
        });
        appToast.success("ئاگادارییەکان چالاککران.");
      }
      setVisible(false);
    } catch {
      appToast.error("چالاککردنی ئاگاداری سەرکەوتوو نەبوو.");
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="notif-prompt-title"
      className="fixed start-3 end-3 bottom-20 z-[80] border border-border bg-card p-4 shadow-[var(--shadow-lg)] sm:start-auto sm:end-5 sm:bottom-24 sm:max-w-sm"
    >
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="notif-prompt-title" className="text-sm font-black">
            ئاگادارییەکانی ERP
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            فرۆشتن، کڕین، کۆگای کەم، ڕاپۆرت و ئاگادارییەکانی سیستەم وەربگرە —
            تەنانەت کاتێک ئەپ داخراوە.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void enable()}
              className="bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "چاوەڕێ بکە…" : "چالاککردن"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={dismiss}
              className="border border-border px-4 py-2 text-xs font-bold"
            >
              دواتر
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 p-1 hover:bg-muted"
          aria-label="داخستن"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
