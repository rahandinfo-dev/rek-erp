import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { tServer } from "@/lib/i18n";
import {
  ensureDefaultDashboardWorkspace,
  saveDashboardWorkspaceBundle,
} from "@/lib/dashboard/workspace/server";

const widgetSchema = z.object({
  id: z.string(),
  widgetKey: z.string(),
  size: z.enum(["small", "medium", "large", "xlarge"]),
  pinned: z.boolean(),
  favorite: z.boolean(),
  hidden: z.boolean(),
  collapsed: z.boolean(),
  order: z.number(),
  settings: z.object({
    refreshInterval: z.union([
      z.literal(0),
      z.literal(30),
      z.literal(60),
      z.literal(300),
      z.literal(900),
      z.literal(1800),
    ]),
    displayMode: z.enum(["default", "compact", "detailed"]),
    chartType: z.enum(["bar", "line", "area", "pie"]),
    sortOrder: z.enum(["asc", "desc", "recent"]),
    itemCount: z.number().min(1).max(50),
    colorTheme: z.enum([
      "default",
      "blue",
      "green",
      "orange",
      "purple",
      "red",
    ]),
    compactMode: z.boolean(),
  }),
});

const bundleSchema = z.object({
  version: z.literal(1).optional(),
  dashboards: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(80),
      sortOrder: z.number(),
      isDefault: z.boolean(),
      isActive: z.boolean(),
      widgets: z.array(widgetSchema),
      updatedAt: z.number().optional(),
    })
  ),
  updatedAt: z.number().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const data = await ensureDefaultDashboardWorkspace(
      user.id,
      user.companyId
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET DASHBOARD WORKSPACE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = bundleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.invalidLayout") },
        { status: 400 }
      );
    }

    const data = await saveDashboardWorkspaceBundle(user.id, user.companyId, {
      version: 1,
      userId: user.id,
      companyId: user.companyId,
      dashboards: parsed.data.dashboards.map((d) => ({
        ...d,
        updatedAt: d.updatedAt || Date.now(),
      })),
      updatedAt: Date.now(),
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("PUT DASHBOARD WORKSPACE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
