"use client";

import { RefreshCw } from "lucide-react";

export default function UpdatePrompt({
  onUpdate,
  onLater,
}: {
  onUpdate: () => void;
  onLater: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 top-0 z-[85] flex justify-center p-3 sm:p-4"
      role="alertdialog"
      aria-labelledby="pwa-update-title"
      aria-describedby="pwa-update-desc"
    >
      <div className="flex w-full max-w-lg flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xl sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h2
            id="pwa-update-title"
            className="text-sm font-bold text-foreground"
          >
            نوێکردنەوە بەردەستە
          </h2>
          <p
            id="pwa-update-desc"
            className="mt-0.5 text-xs text-muted-foreground"
          >
            وەشانی نوێی REK ERP ئامادەیە. نوێکردنەوە خێرا و سەلامەتە.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onLater}
            className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-muted-foreground"
          >
            دواتر
          </button>
          <button
            type="button"
            onClick={onUpdate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            <RefreshCw size={14} />
            ئێستا نوێ بکەرەوە
          </button>
        </div>
      </div>
    </div>
  );
}
