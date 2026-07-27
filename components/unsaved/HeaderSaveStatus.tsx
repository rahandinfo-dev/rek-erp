"use client";

import { useSaveGuard } from "@/lib/unsaved/provider";
import { cn } from "@/lib/utils";
import { useNow } from "@/lib/hooks/useBrowserStore";
import { formatTime } from "@/lib/utils/datetime";
import { useT } from "@/components/i18n/LocaleProvider";

function relativeSaved(
  savedAt: number | null,
  now: number,
  t: (key: string, params?: Record<string, string | number>) => string
) {
  if (!savedAt || !now) return "";
  const sec = Math.max(0, Math.floor((now - savedAt) / 1000));
  if (sec < 5) return "ئێستا";
  if (sec < 60) return t("unsaved.secondsAgo", { count: sec });
  const min = Math.floor(sec / 60);
  if (min < 60) return t("unsaved.minutesAgo", { count: min });
  return formatTime(savedAt);
}

export default function HeaderSaveStatus({
  className = "",
}: {
  className?: string;
}) {
  const { t } = useT();
  const { aggregateState, lastSavedAt, hasUnsaved, history } = useSaveGuard();
  // 0 on the server and during hydration, so the markup cannot diverge.
  const now = useNow();

  const last = history[0];
  const savedLabel = relativeSaved(lastSavedAt, now, t);

  let text = "هەموو گۆڕانکارییەکان پاشەکەوتکران";
  let tone =
    "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]";

  if (aggregateState === "saving") {
    text = t("common.saving");
    tone =
      "bg-[color-mix(in_srgb,var(--info)_12%,transparent)] text-[var(--info)]";
  } else if (aggregateState === "error") {
    text = "پاشەکەوت سەرنەکەوت";
    tone = "bg-destructive/10 text-destructive";
  } else if (hasUnsaved || aggregateState === "modified") {
    text = t("unsaved.unsavedChanges");
    tone =
      "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
  } else if (savedLabel) {
    text = t("unsaved.savedAgo", { when: savedLabel });
  }

  if (aggregateState === "clean" && !lastSavedAt && !hasUnsaved) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-[11rem] items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[11px] font-bold",
        tone,
        className
      )}
      role="status"
      aria-live="polite"
      title={
        last
          ? t("unsaved.lastSavedOn", {
              device: last.device,
              ms: last.durationMs,
            })
          : text
      }
    >
      <span aria-hidden>
        {aggregateState === "saving"
          ? "🔵"
          : aggregateState === "error"
            ? "🔴"
            : hasUnsaved
              ? "🟡"
              : "🟢"}
      </span>
      <span className="truncate">{text}</span>
    </span>
  );
}

export function UnsavedDotBadge({
  className = "",
}: {
  className?: string;
}) {
  const { t } = useT();
  const { hasUnsaved } = useSaveGuard();
  if (!hasUnsaved) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-800",
        className
      )}
      role="status"
      aria-label={t("unsaved.unsavedChanges")}
    >
      ● {t("unsaved.unsavedBadge")}
    </span>
  );
}
