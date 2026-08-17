"use client";

import { AlertTriangle, Check, CloudOff, Loader2, WifiOff } from "lucide-react";
import type { AutoSaveStatus } from "@/lib/drafts/types";
import DraftRestoreDialog from "@/components/ui/DraftRestoreDialog";
import { useNow } from "@/lib/hooks/useBrowserStore";
import { formatTime } from "@/lib/utils/datetime";

function formatRelative(savedAt: number | null | undefined, now: number) {
  if (!savedAt || !now) return "";
  const sec = Math.max(0, Math.floor((now - savedAt) / 1000));
  if (sec < 5) return "ئێستا";
  if (sec < 60) return `${sec} چرکە پێش ئێستا`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} خولەک پێش ئێستا`;
  return formatTime(savedAt);
}

export function AutoSaveStatus({
  status,
  savedAt,
  className = "",
}: {
  status: AutoSaveStatus;
  savedAt?: number | null;
  className?: string;
}) {
  // 0 on the server and during hydration, so the markup cannot diverge.
  const now = useNow(status === "saved" || status === "restored");

  if (status === "idle") return null;

  const time = formatRelative(savedAt, now);

  if (status === "saving") {
    return (
      <span
        className={`rek-autosave-status inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground ${className}`}
        role="status"
        aria-live="polite"
      >
        <Loader2 size={12} className="animate-spin" />
        🔵 پاشەکەوت دەکرێت…
      </span>
    );
  }

  if (status === "unsaved") {
    return (
      <span
        className={`rek-autosave-status inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ${className}`}
        role="status"
        aria-live="polite"
      >
        <AlertTriangle size={12} />
        🟡 گۆڕانکاری پاشەکەوتنەکراو
      </span>
    );
  }

  if (status === "offline") {
    return (
      <span
        className={`rek-autosave-status inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive ${className}`}
        role="status"
        aria-live="assertive"
      >
        <WifiOff size={12} />
        دەرهێڵ
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span
        className={`rek-autosave-status inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive ${className}`}
        role="status"
        aria-live="assertive"
      >
        <CloudOff size={12} />
        🔴 پاشەکەوت سەرنەکەوت
      </span>
    );
  }

  if (status === "waiting") {
    return (
      <span
        className={`rek-autosave-status inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 ${className}`}
        role="status"
        aria-live="assertive"
      >
        <CloudOff size={12} />
        چاوەڕوانی پەیوەندی
      </span>
    );
  }

  if (status === "restored") {
    return (
      <span
        className={`rek-autosave-status inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--info)_12%,white)] px-2.5 py-1 text-xs font-bold text-[var(--info)] ${className}`}
        role="status"
        aria-live="polite"
      >
        <Check size={12} />
        پاشەکەوتەکە گەڕێندرایەوە
      </span>
    );
  }

  return (
    <span
      className={`rek-autosave-status inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,white)] px-2.5 py-1 text-xs font-bold text-[var(--success)] ${className}`}
      role="status"
      aria-live="polite"
    >
      <Check size={12} />
      🟢 {time ? `پاشەکەوتکرا ${time}` : "هەموو گۆڕانکارییەکان پاشەکەوتکران"}
    </span>
  );
}

/** @deprecated Prefer DraftRestoreDialog via AutoSaveBar */
export function DraftRestoreBanner({
  savedAt,
  onRestore,
  onDiscard,
}: {
  savedAt?: number | null;
  onRestore: () => void;
  onDiscard: () => void;
  label?: string;
}) {
  return (
    <DraftRestoreDialog
      open
      savedAt={savedAt}
      onContinue={onRestore}
      onDiscard={onDiscard}
    />
  );
}

export function AutoSaveBar({
  status,
  savedAt,
  hasPendingDraft,
  pendingSavedAt,
  onRestore,
  onDiscard,
  className = "",
}: {
  status: AutoSaveStatus;
  savedAt?: number | null;
  hasPendingDraft?: boolean;
  pendingSavedAt?: number | null;
  onRestore?: () => void;
  onDiscard?: () => void;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {hasPendingDraft && onRestore && onDiscard ? (
        <DraftRestoreDialog
          open
          savedAt={pendingSavedAt}
          onContinue={onRestore}
          onDiscard={onDiscard}
        />
      ) : null}
      {status !== "idle" ? (
        <div className="flex justify-end">
          <AutoSaveStatus status={status} savedAt={savedAt} />
        </div>
      ) : null}
    </div>
  );
}
