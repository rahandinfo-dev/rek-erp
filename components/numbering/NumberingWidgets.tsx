"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Hash } from "lucide-react";
import { useT } from "@/components/i18n/LocaleProvider";

type Stats = {
  rulesEnabled: number;
  countersIssued: number;
  duplicateAlerts: Array<{ type: string; value: string; count: number }>;
};

function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    let active = true;
    const id = window.setTimeout(() => {
      void fetch("/api/numbering/stats", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (active && j.success) setStats(j.data);
        })
        .catch(() => undefined);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(id);
    };
  }, []);
  return stats;
}

export function NumberingStatisticsWidget() {
  const { t } = useT();
  const stats = useStats();
  return (
    <section
      aria-label={t("numbering.statsTitle")}
      className="rek-card overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Hash size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black">{t("numbering.statsTitle")}</h2>
        </div>
        <Link
          href="/dashboard/settings/numbering"
          className="text-xs font-bold text-primary hover:underline"
        >
          {t("common.settings")}
        </Link>
      </div>
      {!stats ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          {t("common.loading")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-5 py-5">
          <div className="rounded-xl border border-border px-3 py-3">
            <p className="text-xs font-bold text-muted-foreground">
              {t("numbering.rulesEnabled")}
            </p>
            <p className="mt-1 text-xl font-black">{stats.rulesEnabled}</p>
          </div>
          <div className="rounded-xl border border-border px-3 py-3">
            <p className="text-xs font-bold text-muted-foreground">
              {t("numbering.numbersIssued")}
            </p>
            <p className="mt-1 text-xl font-black">{stats.countersIssued}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function DuplicateDetectionWidget() {
  const { t } = useT();
  const stats = useStats();
  const alerts = stats?.duplicateAlerts || [];
  return (
    <section
      aria-label={t("numbering.duplicateTitle")}
      className="rek-card overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-primary" aria-hidden />
          <h2 className="text-lg font-black">{t("numbering.duplicateTitle")}</h2>
        </div>
        <Link
          href="/dashboard/settings/numbering"
          className="text-xs font-bold text-primary hover:underline"
        >
          {t("recycle.review")}
        </Link>
      </div>
      {alerts.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          {t("numbering.noDuplicates")}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {alerts.map((a) => (
            <li key={`${a.type}-${a.value}`} className="px-5 py-3">
              <p className="truncate text-sm font-bold text-destructive">
                {a.type.toUpperCase()}: {a.value}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("numbering.recordsCount", { count: a.count })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
