"use client";
import { formatDateTime } from "@/lib/utils/datetime";

import { useSaveGuard } from "@/lib/unsaved/provider";
import { AUTO_SAVE_DELAYS } from "@/lib/unsaved/types";
import { cn } from "@/lib/utils";

export default function AutoSaveSettingsPanel({
  className = "",
}: {
  className?: string;
}) {
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
        Auto Save
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Protect unsaved work with smart auto-save, leave guards, and sync.
      </p>

      <div className="mt-6 space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-2xl bg-muted/50 px-4 py-3">
          <span className="text-sm font-bold">Enable Auto Save</span>
          <input
            type="checkbox"
            checked={prefs.autoSaveEnabled}
            disabled={!ready}
            onChange={(e) =>
              setPrefs({ autoSaveEnabled: e.target.checked })
            }
            className="size-4 accent-primary"
            aria-label="Enable Auto Save"
          />
        </label>

        <div className="rounded-2xl bg-muted/50 px-4 py-3">
          <p className="text-sm font-bold">Auto Save Delay</p>
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
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {history[0] ? (
          <div className="rounded-2xl border border-border px-4 py-3 text-xs text-muted-foreground">
            <p className="font-bold text-foreground">Last Saved</p>
            <p className="mt-1">
              {formatDateTime(history[0].savedAt, true)} ·{" "}
              {history[0].device} · {history[0].durationMs}ms
              {history[0].ok ? "" : " · failed"}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
