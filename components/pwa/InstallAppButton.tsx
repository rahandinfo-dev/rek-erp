"use client";

import { Download, Check } from "lucide-react";
import { usePwaOptional } from "@/components/pwa/PwaProvider";
import { cn } from "@/lib/utils";

export default function InstallAppButton({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const pwa = usePwaOptional();
  if (!pwa) return null;

  if (pwa.installed) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-2.5 py-1 text-[11px] font-bold text-[var(--success)]",
          className
        )}
        title="وەک ئەپ دامەزراوە"
      >
        <Check size={12} />
        {compact ? "ئەپ" : "دامەزراوە"}
      </span>
    );
  }

  if (!pwa.canInstall) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (pwa.deferredPrompt) void pwa.promptInstall();
        else pwa.openInstallGuide();
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary transition hover:bg-primary/20",
        className
      )}
      aria-label="دامەزراندنی ئەپی REK ERP"
    >
      <Download size={12} />
      {compact ? "دامەزراندن" : "دامەزراندنی ئەپ"}
    </button>
  );
}
