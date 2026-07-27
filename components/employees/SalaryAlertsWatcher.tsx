"use client";

import { useEffect, useRef } from "react";
import { appToast } from "@/lib/toast";
import { useT } from "@/components/i18n/LocaleProvider";

/**
 * Runs salary-due detection once per mount and surfaces new alerts as toasts.
 * Notifications are already persisted for Notification Center + Activity Feed.
 */
export default function SalaryAlertsWatcher({
  toast = true,
}: {
  toast?: boolean;
}) {
  const { t } = useT();
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
            a.daysUntil < 0
              ? t("employees.salaryOverdueTitle")
              : t("employees.salarySoonTitle");
          appToast.salaryAlert(
            a.daysUntil < 0
              ? t("employees.salaryOverdueBody", {
                  name: a.fullName,
                  days: Math.abs(a.daysUntil),
                })
              : a.daysUntil === 0
                ? t("employees.salaryTodayBody", { name: a.fullName })
                : t("employees.salaryInDaysBody", {
                    name: a.fullName,
                    days: a.daysUntil,
                    date: a.nextSalaryDate,
                  }),
            title
          );
          return;
        }

        appToast.salaryAlert(
          t("employees.salaryAlertsMany", { count: created.length }),
          t("toast.salaryAlertTitle")
        );
      })
      .catch(console.error);
  }, [toast, t]);

  return null;
}
