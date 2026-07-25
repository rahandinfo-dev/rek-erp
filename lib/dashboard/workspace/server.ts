import { db } from "@/lib/prisma/db";
import {
  buildDefaultDashboard,
  emptyBundle,
  type DashboardLayout,
  type DashboardWorkspaceBundle,
  type WidgetInstance,
} from "@/lib/dashboard/workspace/types";

function parseLayout(raw: unknown, fallback: DashboardLayout): DashboardLayout {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Partial<DashboardLayout>;
  if (!Array.isArray(o.widgets)) return fallback;
  return {
    id: String(o.id || fallback.id),
    name: String(o.name || fallback.name),
    sortOrder: Number(o.sortOrder ?? fallback.sortOrder),
    isDefault: Boolean(o.isDefault),
    isActive: Boolean(o.isActive),
    widgets: o.widgets as WidgetInstance[],
    updatedAt: Number(o.updatedAt || Date.now()),
  };
}

export async function loadDashboardWorkspaceBundle(
  userId: string,
  companyId: string
): Promise<DashboardWorkspaceBundle> {
  const rows = await db.dashboardWorkspace.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });

  if (!rows.length) {
    return emptyBundle(userId, companyId);
  }

  const dashboards = rows.map((r) => {
    const base = buildDefaultDashboard(userId, companyId, r.name, r.id);
    const layout = parseLayout(r.layout, base);
    return {
      ...layout,
      id: r.id,
      name: r.name,
      sortOrder: r.sortOrder,
      isDefault: r.isDefault,
      isActive: r.isActive,
      updatedAt: r.updatedAt.getTime(),
    };
  });

  return {
    version: 1,
    userId,
    companyId,
    dashboards,
    updatedAt: Math.max(...dashboards.map((d) => d.updatedAt), Date.now()),
  };
}

export async function ensureDefaultDashboardWorkspace(
  userId: string,
  companyId: string
) {
  const count = await db.dashboardWorkspace.count({ where: { userId } });
  if (count > 0) return loadDashboardWorkspaceBundle(userId, companyId);

  const dash = buildDefaultDashboard(userId, companyId);
  await db.dashboardWorkspace.create({
    data: {
      id: dash.id,
      companyId,
      userId,
      name: dash.name,
      sortOrder: 0,
      isDefault: true,
      isActive: true,
      layout: dash as object,
    },
  });

  return loadDashboardWorkspaceBundle(userId, companyId);
}

export async function saveDashboardWorkspaceBundle(
  userId: string,
  companyId: string,
  bundle: DashboardWorkspaceBundle
) {
  await db.$transaction(async (tx) => {
    await tx.dashboardWorkspace.deleteMany({ where: { userId } });
    if (!bundle.dashboards.length) return;
    await tx.dashboardWorkspace.createMany({
      data: bundle.dashboards.map((d, idx) => ({
        id: d.id,
        companyId,
        userId,
        name: d.name.slice(0, 80),
        sortOrder: d.sortOrder ?? idx,
        isDefault: d.isDefault,
        isActive: d.isActive,
        layout: {
          ...d,
          widgets: d.widgets,
        } as object,
      })),
    });
  });

  return loadDashboardWorkspaceBundle(userId, companyId);
}
