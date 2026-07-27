"use client";
import { formatDateTime } from "@/lib/utils/datetime";

import { useSaveGuard } from "@/lib/unsaved/provider";
import { AUTO_SAVE_DELAYS } from "@/lib/unsaved/types";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/LocaleProvider";

const DELAY_KEYS: Record<number, string> = {
  5000: "unsaved.delay5s",
  10000: "unsaved.delay10s",
  30000: "unsaved.delay30s",
  60000: "unsaved.delay1m",
};

export default function AutoSaveSettingsPanel({
  className = "",
}: {
  className?: string;
}) {
  const { t } = useT();
  const { prefs, setPrefs, history, ready } = useSaveGuard();

  return (
    <section
      className={cn(
        "rounded-3xl border border-border bg-card p-6 sm:p-8",
        className
      )}
      aria-labelledby="autosave-settings-title"
    >
      <h2
        id="autosave-settings-title"
        className="text-xl font-bold text-foreground"
      >
        {t("unsaved.autoSave")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("unsaved.autoSaveHint")}
      </p>

      <div className="mt-6 space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-2xl bg-muted/50 px-4 py-3">
          <span className="text-sm font-bold">{t("unsaved.enableAutoSave")}</span>
          <input
            type="checkbox"
            checked={prefs.autoSaveEnabled}
            disabled={!ready}
            onChange={(e) => setPrefs({ autoSaveEnabled: e.target.checked })}
            className="size-4 accent-primary"
            aria-label={t("unsaved.enableAutoSave")}
          />
        </label>

        <div className="rounded-2xl bg-muted/50 px-4 py-3">
          <p className="text-sm font-bold">{t("unsaved.autoSaveDelay")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {AUTO_SAVE_DELAYS.map((d) => (
              <button
                key={d.ms}
                type="button"
                disabled={!ready || !prefs.autoSaveEnabled}
                onClick={() => setPrefs({ autoSaveDelayMs: d.ms })}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold transition",
                  prefs.autoSaveDelayMs === d.ms
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {t(DELAY_KEYS[d.ms] || "unsaved.delay5s")}
              </button>
            ))}
          </div>
        </div>

        {history[0] ? (
          <div className="rounded-2xl border border-border px-4 py-3 text-xs text-muted-foreground">
            <p className="font-bold text-foreground">{t("unsaved.lastSaved")}</p>
            <p className="mt-1">
              {formatDateTime(history[0].savedAt, true)} · {history[0].device} ·{" "}
              {history[0].durationMs}ms
              {history[0].ok ? "" : ` · ${t("unsaved.failed")}`}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
