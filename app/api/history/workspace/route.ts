import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import type { Prisma } from "@/lib/prisma/client";
import { tServer } from "@/lib/i18n";

const putSchema = z.object({
  pathname: z.string().min(1).max(500),
  search: z.string().max(2000).optional(),
  tab: z.string().max(120).nullable().optional(),
  filters: z.record(z.string(), z.string()).optional(),
  sort: z.string().max(80).nullable().optional(),
  page: z.string().max(20).nullable().optional(),
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

    const row = await db.workspaceState.findUnique({
      where: { userId: user.id },
    });

    if (!row) {
      return NextResponse.json({ success: true, data: null });
    }

    const payload = (row.payload || {}) as {
      filters?: Record<string, string>;
      sort?: string | null;
      page?: string | null;
    };

    return NextResponse.json({
      success: true,
      data: {
        version: 1 as const,
        userId: row.userId,
        companyId: row.companyId,
        pathname: row.pathname,
        search: row.search,
        tab: row.tab,
        filters: payload.filters || {},
        sort: payload.sort ?? null,
        page: payload.page ?? null,
        updatedAt: row.updatedAt.getTime(),
      },
    });
  } catch (error) {
    console.error("GET WORKSPACE ERROR:", error);
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
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.invalid") },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const payload = {
      filters: d.filters || {},
      sort: d.sort ?? null,
      page: d.page ?? null,
    } as Prisma.InputJsonValue;

    const row = await db.workspaceState.upsert({
      where: { userId: user.id },
      create: {
        companyId: user.companyId,
        userId: user.id,
        pathname: d.pathname,
        search: d.search || "",
        tab: d.tab ?? null,
        payload,
      },
      update: {
        pathname: d.pathname,
        search: d.search || "",
        tab: d.tab ?? null,
        payload,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        version: 1 as const,
        userId: row.userId,
        companyId: row.companyId,
        pathname: row.pathname,
        search: row.search,
        tab: row.tab,
        filters: d.filters || {},
        sort: d.sort ?? null,
        page: d.page ?? null,
        updatedAt: row.updatedAt.getTime(),
      },
    });
  } catch (error) {
    console.error("PUT WORKSPACE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
