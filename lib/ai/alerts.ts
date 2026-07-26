import { db } from "@/lib/prisma/db";
import { getCachedAnalytics } from "@/lib/cache/company-reads";
import { notifySafe } from "@/lib/notifications/create";
import type { AiAlertView } from "@/lib/ai/types";
import { aiCacheGet, aiCacheKey, aiCacheSet } from "@/lib/ai/cache";

function mapAlert(row: {
  id: string;
  kind: string;
  title: string;
  message: string;
  severity: string;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  status: string;
  createdAt: Date;
}): AiAlertView {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    message: row.message,
    severity: row.severity,
    href: row.href,
    entityType: row.entityType,
    entityId: row.entityId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listOpenAlerts(companyId: string): Promise<AiAlertView[]> {
  const rows = await db.aiAlert.findMany({
    where: { companyId, status: "open" },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return rows.map(mapAlert);
}

/** Scan business data and upsert open AI alerts (background-safe). */
export async function refreshAiAlerts(companyId: string): Promise<AiAlertView[]> {
  const cacheKey = aiCacheKey(companyId, "alerts-refresh");
  const cached = aiCacheGet<AiAlertView[]>(cacheKey, 45_000);
  if (cached) return cached;

  const analytics = await getCachedAnalytics(companyId);
  const desired: Array<{
    kind: string;
    title: string;
    message: string;
    severity: string;
    href?: string;
    entityType?: string;
    entityId?: string;
  }> = [];

  if (analytics.summary.lowStockCount > 0) {
    desired.push({
      kind: "low_stock",
      title: "کەمی کۆگا دۆزرایەوە",
      message: `${analytics.summary.lowStockCount} products are at or below minimum stock.`,
      severity: "warning",
      href: "/dashboard/inventory",
    });
  }

  // Overstock: currentStock > maximumStock when maximum > 0
  const overstock = await db.product.findMany({
    where: {
      companyId,
      active: true,
      maximumStock: { gt: 0 },
    },
    select: {
      id: true,
      name: true,
      currentStock: true,
      maximumStock: true,
    },
    take: 200,
  });
  const over = overstock.filter(
    (p) => Number(p.currentStock) > Number(p.maximumStock)
  );
  if (over.length) {
    desired.push({
      kind: "overstock",
      title: "Overstock risk",
      message: `${over.length} products exceed maximum stock levels.`,
      severity: "info",
      href: "/dashboard/products",
      entityType: "Product",
      entityId: over[0]?.id,
    });
  }

  const creditCount = await db.sale.count({
    where: {
      companyId,
      status: "COMPLETED",
      paymentMethod: "CREDIT",
    },
  });
  if (creditCount > 0) {
    desired.push({
      kind: "unpaid_invoices",
      title: "Credit / unpaid sales",
      message: `${creditCount} completed credit sales may need collection.`,
      severity: "warning",
      href: "/dashboard/sales",
    });
  }

  // Late payments: credit sales older than 30 days
  const thirtyAgo = new Date(Date.now() - 30 * 86400000);
  const late = await db.sale.count({
    where: {
      companyId,
      status: "COMPLETED",
      paymentMethod: "CREDIT",
      saleDate: { lt: thirtyAgo },
    },
  });
  if (late > 0) {
    desired.push({
      kind: "late_payments",
      title: "Late credit payments",
      message: `${late} credit sales are older than 30 days.`,
      severity: "critical",
      href: "/dashboard/customers",
    });
  }

  if (analytics.summary.profitThisMonth < 0) {
    desired.push({
      kind: "negative_margin",
      title: "قازانجی نەرێنی لەم مانگەدا",
      message: "This month's profit is negative — review costs and pricing.",
      severity: "critical",
      href: "/dashboard/reports",
    });
  }

  // Unusual sales: today revenue > 2.5x average daily this month (simple)
  const days = Math.max(1, new Date().getDate());
  const avgDaily = analytics.summary.revenueThisMonth / days;
  if (
    avgDaily > 0 &&
    analytics.summary.revenueToday > avgDaily * 2.5 &&
    analytics.summary.revenueToday > 0
  ) {
    desired.push({
      kind: "unusual_sales",
      title: "Unusual sales activity",
      message: "Today's revenue is significantly above the month-to-date daily average.",
      severity: "info",
      href: "/dashboard/analytics",
    });
  }

  // Duplicate SKU / barcode (active products)
  const products = await db.product.findMany({
    where: { companyId, active: true },
    select: { id: true, sku: true, barcode: true },
    take: 2000,
  });
  const skuMap = new Map<string, string[]>();
  const barMap = new Map<string, string[]>();
  for (const p of products) {
    const s = p.sku.trim().toLowerCase();
    skuMap.set(s, [...(skuMap.get(s) || []), p.id]);
    if (p.barcode) {
      const b = p.barcode.trim().toLowerCase();
      barMap.set(b, [...(barMap.get(b) || []), p.id]);
    }
  }
  const dupSku = [...skuMap.values()].filter((ids) => ids.length > 1).length;
  const dupBar = [...barMap.values()].filter((ids) => ids.length > 1).length;
  if (dupSku + dupBar > 0) {
    desired.push({
      kind: "duplicate_records",
      title: "Possible duplicate products",
      message: `${dupSku} duplicate SKU groups · ${dupBar} duplicate barcode groups.`,
      severity: "warning",
      href: "/dashboard/products",
    });
  }

  // Upsert open alerts by kind (one open row per kind)
  for (const d of desired) {
    const existing = await db.aiAlert.findFirst({
      where: { companyId, kind: d.kind, status: "open" },
    });
    if (existing) {
      await db.aiAlert.update({
        where: { id: existing.id },
        data: {
          title: d.title,
          message: d.message,
          severity: d.severity,
          href: d.href || null,
          entityType: d.entityType || null,
          entityId: d.entityId || null,
        },
      });
    } else {
      await db.aiAlert.create({
        data: {
          companyId,
          kind: d.kind,
          title: d.title,
          message: d.message,
          severity: d.severity,
          href: d.href || null,
          entityType: d.entityType || null,
          entityId: d.entityId || null,
        },
      });
      void notifySafe({
        companyId,
        title: d.title,
        message: d.message,
        category: d.severity === "critical" ? "WARNING" : "SYSTEM",
        priority: d.severity === "critical" ? "HIGH" : "NORMAL",
        href: d.href || "/dashboard/ai-assistant",
        metadata: { kind: "AI_ALERT", alertKind: d.kind },
      });
    }
  }

  // Resolve kinds no longer present
  const keep = new Set(desired.map((d) => d.kind));
  const open = await db.aiAlert.findMany({
    where: { companyId, status: "open" },
    select: { id: true, kind: true },
  });
  for (const row of open) {
    if (!keep.has(row.kind)) {
      await db.aiAlert.update({
        where: { id: row.id },
        data: { status: "resolved", resolvedAt: new Date() },
      });
    }
  }

  const result = await listOpenAlerts(companyId);
  aiCacheSet(cacheKey, result);
  return result;
}

export async function acknowledgeAlert(
  companyId: string,
  alertId: string
): Promise<boolean> {
  const row = await db.aiAlert.findFirst({
    where: { id: alertId, companyId },
  });
  if (!row) return false;
  await db.aiAlert.update({
    where: { id: row.id },
    data: { status: "acknowledged", acknowledgedAt: new Date() },
  });
  return true;
}
