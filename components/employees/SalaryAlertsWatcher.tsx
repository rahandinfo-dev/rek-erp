"use client";

import { useEffect, useRef } from "react";
import { appToast } from "@/lib/toast";

/**
 * Runs salary-due detection once per mount and surfaces new alerts as toasts.
 * Notifications are already persisted for Notification Center + Activity Feed.
 */
export default function SalaryAlertsWatcher({
  toast = true,
}: {
  toast?: boolean;
}) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void fetch("/api/employees/salary-alerts")
      .then((res) => res.json())
      .then((json) => {
        if (!json.success || !toast) return;
        const created = (json.data?.created || []) as Array<{
          fullName: string;
          daysUntil: number;
          nextSalaryDate: string;
        }>;

        if (created.length === 0) return;

        if (created.length === 1) {
          const a = created[0];
          const title =
            a.daysUntil < 0 ? "مووچە دواکەوتووە" : "مووچە نزیکە";
          appToast.salaryAlert(
            a.daysUntil < 0
              ? `${a.fullName} · ${Math.abs(a.daysUntil)} ڕۆژ دواکەوتوو`
              : a.daysUntil === 0
                ? `${a.fullName} · ئەمڕۆ`
                : `${a.fullName} · دوای ${a.daysUntil} ڕۆژ (${a.nextSalaryDate})`,
            title
          );
          return;
        }

        appToast.salaryAlert(
          `${created.length} کارمەند مووچەیان نزیکە یان دواکەوتووە.`,
          "ئاگاداری مووچە"
        );
      })
      .catch(console.error);
  }, [toast]);

  return null;
}
