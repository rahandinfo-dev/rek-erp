"use client";

import type { ConnectionStatus } from "@/lib/recovery/types";
import { useT } from "@/components/i18n/LocaleProvider";

const DOT: Record<ConnectionStatus, string> = {
  online: "bg-[var(--success)]",
  syncing: "bg-amber-400",
  offline: "bg-destructive",
};

export default function ConnectionStatusBadge({
  status,
  className = "",
}: {
  status: ConnectionStatus;
  className?: string;
}) {
  const { t } = useT();
  const label =
    status === "online"
      ? t("recovery.online")
      : status === "syncing"
        ? t("recovery.syncing")
        : t("recovery.offline");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-muted-foreground ${className}`}
      role="status"
      aria-live="polite"
      title={t("recovery.connectionTitle", { status: label })}
    >
      <span
        className={`size-2 shrink-0 rounded-full ${DOT[status]} ${
          status === "syncing" ? "animate-pulse" : ""
        }`}
        aria-hidden
      />
      {label}
    </span>
  );
}
