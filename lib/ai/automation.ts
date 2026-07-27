import { db } from "@/lib/prisma/db";
import { notifySafe } from "@/lib/notifications/create";
import { auditSafe } from "@/lib/audit/log";
import { buildReports } from "@/lib/reports/buildReports";
import { formatMoneyLocalized, tServer } from "@/lib/i18n";
import { refreshAiAlerts } from "@/lib/ai/alerts";
import { refreshAiInsights } from "@/lib/ai/insights";
import { buildRecommendations } from "@/lib/ai/recommendations";

const t = tServer.t.bind(tServer);

function nextRunFromSchedule(schedule: string, from = new Date()): Date {
  const d = new Date(from);
  switch (schedule) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "on_alert":
      d.setHours(d.getHours() + 6);
      break;
    default:
      d.setDate(d.getDate() + 1);
  }
  return d;
}

/** Ensure default automation rules exist for a company. */
export async function ensureDefaultAutomations(companyId: string) {
  const count = await db.aiAutomationRule.count({ where: { companyId } });
  if (count > 0) return;

  const defaults = [
    {
      name: t("ai.automation.dailyInsights"),
      kind: "notification",
      schedule: "daily",
      config: { action: "refresh_insights" },
    },
    {
      name: t("ai.automation.dailyAlerts"),
      kind: "notification",
      schedule: "daily",
      config: { action: "refresh_alerts" },
    },
    {
      name: t("ai.automation.weeklyReport"),
      kind: "report",
      schedule: "weekly",
      config: { action: "weekly_report" },
    },
    {
      name: t("ai.automation.restockReminders"),
      kind: "reminder",
      schedule: "daily",
      config: { action: "restock_reminders" },
    },
  ];

  await db.aiAutomationRule.createMany({
    data: defaults.map((d) => ({
      companyId,
      name: d.name,
      kind: d.kind,
      schedule: d.schedule,
      config: d.config,
      enabled: true,
      nextRunAt: nextRunFromSchedule(d.schedule),
    })),
  });
}

export async function listAutomations(companyId: string) {
  await ensureDefaultAutomations(companyId);
  return db.aiAutomationRule.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
  });
}

/** Process due automation rules (background). */
export async function runDueAutomations(companyId: string) {
  await ensureDefaultAutomations(companyId);
  const now = new Date();
  const due = await db.aiAutomationRule.findMany({
    where: {
      companyId,
      enabled: true,
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
    },
    take: 20,
  });

  const results: Array<{ id: string; name: string; ok: boolean }> = [];

  for (const rule of due) {
    const config = (rule.config || {}) as { action?: string };
    try {
      switch (config.action) {
        case "refresh_insights":
          await refreshAiInsights(companyId);
          break;
        case "refresh_alerts":
          await refreshAiAlerts(companyId);
          break;
        case "weekly_report": {
          const report = await buildReports(companyId, {
            preset: "week",
            granularity: "daily",
          });
          await notifySafe({
            companyId,
            title: t("ai.automation.weeklyReadyTitle"),
            message: t("ai.automation.weeklyReadyMessage", {
              revenue: formatMoneyLocalized(report.summary.revenue),
              profit: formatMoneyLocalized(report.summary.profit),
            }),
            category: "SYSTEM",
            href: "/dashboard/reports",
            metadata: { kind: "AI_AUTOMATION", ruleId: rule.id },
          });
          break;
        }
        case "restock_reminders": {
          const recs = await buildRecommendations(companyId);
          const restock = recs.filter((r) => r.kind === "restock").slice(0, 5);
          if (restock.length) {
            await notifySafe({
              companyId,
              title: t("ai.automation.restockTitle"),
              message: restock.map((r) => r.title).join(" · "),
              category: "INVENTORY",
              priority: "HIGH",
              href: "/dashboard/inventory",
              metadata: { kind: "AI_AUTOMATION", ruleId: rule.id },
            });
          }
          break;
        }
        default:
          await refreshAiAlerts(companyId);
      }

      await db.aiAutomationRule.update({
        where: { id: rule.id },
        data: {
          lastRunAt: now,
          nextRunAt: nextRunFromSchedule(rule.schedule, now),
        },
      });

      await auditSafe({
        companyId,
        module: "SYSTEM",
        action: "OTHER",
        entityType: "AiAutomationRule",
        entityId: rule.id,
        summary: t("ai.automation.ranSummary", { name: rule.name }),
        metadata: { ai: true, action: config.action || "unknown" },
      });

      results.push({ id: rule.id, name: rule.name, ok: true });
    } catch (error) {
      console.error("AI automation error:", error);
      results.push({ id: rule.id, name: rule.name, ok: false });
    }
  }

  return results;
}

export async function suggestedNextActions(companyId: string) {
  const [alerts, recs] = await Promise.all([
    refreshAiAlerts(companyId),
    buildRecommendations(companyId),
  ]);
  const actions: Array<{ title: string; href: string; reason: string }> = [];

  if (alerts.some((a) => a.kind === "low_stock")) {
    actions.push({
      title: t("ai.automation.reviewLowStock"),
      href: "/dashboard/inventory",
      reason: t("ai.automation.reviewLowStockReason"),
    });
  }
  if (alerts.some((a) => a.kind === "unpaid_invoices" || a.kind === "late_payments")) {
    actions.push({
      title: t("ai.automation.followCredit"),
      href: "/dashboard/customers",
      reason: t("ai.automation.followCreditReason"),
    });
  }
  actions.push({
    title: t("ai.automation.createSale"),
    href: "/dashboard/sales/new",
    reason: t("ai.automation.createSaleReason"),
  });
  actions.push({
    title: t("ai.automation.openReport"),
    href: "/dashboard/reports",
    reason: t("ai.automation.openReportReason"),
  });
  if (recs[0]) {
    actions.push({
      title: recs[0].title,
      href: recs[0].href,
      reason: recs[0].reason,
    });
  }
  return actions.slice(0, 6);
}
