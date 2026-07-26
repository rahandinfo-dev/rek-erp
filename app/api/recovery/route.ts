import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { RECOVERY_TTL_MS } from "@/lib/recovery/types";
import type { Prisma } from "@/lib/prisma/client";

const putSchema = z.object({
  id: z.string().optional(),
  moduleKey: z.string().min(1).max(80),
  title: z.string().max(120).nullable().optional(),
  pathname: z.string().min(1).max(500),
  search: z.string().max(2000).optional(),
  payload: z.unknown(),
  summary: z.unknown(),
  createdAt: z.number().optional(),
  lastEditedAt: z.number().optional(),
  lastSavedAt: z.number().optional(),
  expiresAt: z.number().optional(),
  sizeBytes: z.number().optional(),
});

function toRecord(row: {
  id: string;
  userId: string;
  companyId: string;
  moduleKey: string;
  title: string | null;
  pathname: string;
  search: string;
  payload: unknown;
  summary: unknown;
  createdAt: Date;
  lastEditedAt: Date;
  lastSavedAt: Date;
  expiresAt: Date;
  sizeBytes: number;
}) {
  return {
    version: 1 as const,
    id: row.id,
    userId: row.userId,
    companyId: row.companyId,
    moduleKey: row.moduleKey,
    title: row.title,
    pathname: row.pathname,
    search: row.search,
    payload: row.payload,
    summary: row.summary,
    createdAt: row.createdAt.getTime(),
    lastEditedAt: row.lastEditedAt.getTime(),
    lastSavedAt: row.lastSavedAt.getTime(),
    expiresAt: row.expiresAt.getTime(),
    sizeBytes: row.sizeBytes,
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await db.sessionRecovery.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });

    const rows = await db.sessionRecovery.findMany({
      where: { userId: user.id },
      orderBy: { lastEditedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: rows.map(toRecord),
    });
  } catch (error) {
    console.error("GET RECOVERY ERROR:", error);
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
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid session" },
        { status: 400 }
      );
    }

    const now = Date.now();
    const d = parsed.data;
    const lastEditedAt = new Date(d.lastEditedAt || now);
    const lastSavedAt = new Date(d.lastSavedAt || now);
    const expiresAt = new Date(d.expiresAt || now + RECOVERY_TTL_MS);
    const createdAt = new Date(d.createdAt || now);

    const row = await db.sessionRecovery.upsert({
      where: {
        userId_moduleKey: {
          userId: user.id,
          moduleKey: d.moduleKey,
        },
      },
      create: {
        companyId: user.companyId,
        userId: user.id,
        moduleKey: d.moduleKey,
        title: d.title ?? null,
        pathname: d.pathname,
        search: d.search || "",
        payload: d.payload as Prisma.InputJsonValue,
        summary: d.summary as Prisma.InputJsonValue,
        createdAt,
        lastEditedAt,
        lastSavedAt,
        expiresAt,
        sizeBytes: d.sizeBytes || 0,
      },
      update: {
        title: d.title ?? undefined,
        pathname: d.pathname,
        search: d.search || "",
        payload: d.payload as Prisma.InputJsonValue,
        summary: d.summary as Prisma.InputJsonValue,
        lastEditedAt,
        lastSavedAt,
        expiresAt,
        sizeBytes: d.sizeBytes || 0,
      },
    });

    return NextResponse.json({ success: true, data: toRecord(row) });
  } catch (error) {
    console.error("PUT RECOVERY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const all = req.nextUrl.searchParams.get("all") === "1";
    const moduleKey = req.nextUrl.searchParams.get("moduleKey");

    if (all) {
      await db.sessionRecovery.deleteMany({ where: { userId: user.id } });
    } else if (moduleKey) {
      await db.sessionRecovery.deleteMany({
        where: { userId: user.id, moduleKey },
      });
    } else {
      return NextResponse.json(
        { success: false, message: "moduleKey required" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE RECOVERY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
