import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { HISTORY_LIMIT, HISTORY_TTL_MS } from "@/lib/history/types";
import { tServer } from "@/lib/i18n";

const putSchema = z.object({
  id: z.string().optional(),
  moduleKey: z.string().min(1).max(60),
  entityType: z.string().max(80).nullable().optional(),
  entityId: z.string().max(80).nullable().optional(),
  href: z.string().min(1).max(500),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(120).nullable().optional(),
  thumbnail: z.string().max(500).nullable().optional(),
  action: z
    .enum(["viewed", "edited", "created", "printed", "downloaded"])
    .optional(),
  pinned: z.boolean().optional(),
  openedAt: z.number().optional(),
  expiresAt: z.number().nullable().optional(),
});

const patchSchema = z.object({
  href: z.string().min(1).max(500),
  pinned: z.boolean(),
});

function toItem(row: {
  id: string;
  userId: string;
  companyId: string;
  moduleKey: string;
  entityType: string | null;
  entityId: string | null;
  href: string;
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  action: string;
  pinned: boolean;
  openedAt: Date;
  expiresAt: Date | null;
}) {
  return {
    version: 1 as const,
    id: row.id,
    userId: row.userId,
    companyId: row.companyId,
    moduleKey: row.moduleKey,
    entityType: row.entityType,
    entityId: row.entityId,
    href: row.href,
    title: row.title,
    subtitle: row.subtitle,
    thumbnail: row.thumbnail,
    action: row.action as
      | "viewed"
      | "edited"
      | "created"
      | "printed"
      | "downloaded",
    pinned: row.pinned,
    openedAt: row.openedAt.getTime(),
    expiresAt: row.expiresAt ? row.expiresAt.getTime() : null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const moduleKey = (req.nextUrl.searchParams.get("module") || "").trim();
    const action = (req.nextUrl.searchParams.get("action") || "").trim();
    const cursor = (req.nextUrl.searchParams.get("cursor") || "").trim();
    const take = Math.min(
      50,
      Math.max(10, Number(req.nextUrl.searchParams.get("take") || 30) || 30)
    );

    // Cleanup expired unpinned
    await db.navigationHistory.deleteMany({
      where: {
        userId: user.id,
        pinned: false,
        expiresAt: { lt: new Date() },
      },
    });

    const where: {
      userId: string;
      moduleKey?: string;
      action?: string;
      OR?: Array<Record<string, unknown>>;
      openedAt?: { lt: Date };
    } = { userId: user.id };

    if (moduleKey) where.moduleKey = moduleKey;
    if (action) where.action = action;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { subtitle: { contains: q, mode: "insensitive" } },
        { href: { contains: q, mode: "insensitive" } },
      ];
    }
    if (cursor) {
      const n = Number(cursor);
      if (!Number.isNaN(n)) where.openedAt = { lt: new Date(n) };
    }

    const rows = await db.navigationHistory.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { openedAt: "desc" }],
      take: take + 1,
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore
      ? String(page[page.length - 1]?.openedAt.getTime() || "")
      : null;

    // Also return a trimmed full sync set when no filters (for client cache)
    if (!q && !moduleKey && !action && !cursor) {
      const all = await db.navigationHistory.findMany({
        where: { userId: user.id },
        orderBy: [{ pinned: "desc" }, { openedAt: "desc" }],
        take: HISTORY_LIMIT + 40,
      });
      const pinned = all.filter((r) => r.pinned);
      const unpinned = all.filter((r) => !r.pinned).slice(0, HISTORY_LIMIT);
      const keepIds = new Set([...pinned, ...unpinned].map((r) => r.id));
      const drop = all.filter((r) => !keepIds.has(r.id));
      if (drop.length) {
        await db.navigationHistory.deleteMany({
          where: { id: { in: drop.map((d) => d.id) }, userId: user.id },
        });
      }
      return NextResponse.json({
        success: true,
        data: [...pinned, ...unpinned].map(toItem),
        page: page.map(toItem),
        nextCursor,
        hasMore,
      });
    }

    return NextResponse.json({
      success: true,
      data: page.map(toItem),
      page: page.map(toItem),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("GET HISTORY ERROR:", error);
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
    const now = Date.now();
    const openedAt = new Date(d.openedAt || now);
    const pinned = Boolean(d.pinned);
    const expiresAt = pinned
      ? null
      : new Date(d.expiresAt ?? now + HISTORY_TTL_MS);

    const existing = await db.navigationHistory.findUnique({
      where: { userId_href: { userId: user.id, href: d.href } },
    });

    const actionRank = {
      created: 5,
      printed: 4,
      downloaded: 4,
      edited: 3,
      viewed: 1,
    } as const;
    const nextAction = d.action || "viewed";
    const existingRank =
      actionRank[existing?.action as keyof typeof actionRank] || 0;
    const nextRank = actionRank[nextAction] || 1;
    const action =
      existing && existingRank > nextRank ? existing.action : nextAction;

    const row = await db.navigationHistory.upsert({
      where: { userId_href: { userId: user.id, href: d.href } },
      create: {
        companyId: user.companyId,
        userId: user.id,
        moduleKey: d.moduleKey,
        entityType: d.entityType ?? null,
        entityId: d.entityId ?? null,
        href: d.href,
        title: d.title,
        subtitle: d.subtitle ?? null,
        thumbnail: d.thumbnail ?? null,
        action,
        pinned,
        openedAt,
        expiresAt,
      },
      update: {
        title: d.title,
        subtitle: d.subtitle ?? undefined,
        thumbnail: d.thumbnail ?? undefined,
        moduleKey: d.moduleKey,
        entityType: d.entityType ?? undefined,
        entityId: d.entityId ?? undefined,
        action,
        openedAt,
        expiresAt: pinned ? null : expiresAt,
        pinned: d.pinned !== undefined ? pinned : undefined,
      },
    });

    // Trim oldest unpinned beyond limit
    const unpinned = await db.navigationHistory.findMany({
      where: { userId: user.id, pinned: false },
      orderBy: { openedAt: "desc" },
      select: { id: true },
    });
    if (unpinned.length > HISTORY_LIMIT) {
      const excess = unpinned.slice(HISTORY_LIMIT).map((r) => r.id);
      await db.navigationHistory.deleteMany({
        where: { id: { in: excess }, userId: user.id },
      });
    }

    return NextResponse.json({ success: true, data: toItem(row) });
  } catch (error) {
    console.error("PUT HISTORY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.invalid") },
        { status: 400 }
      );
    }

    const row = await db.navigationHistory.updateMany({
      where: { userId: user.id, href: parsed.data.href },
      data: {
        pinned: parsed.data.pinned,
        expiresAt: parsed.data.pinned
          ? null
          : new Date(Date.now() + HISTORY_TTL_MS),
      },
    });

    return NextResponse.json({ success: true, updated: row.count });
  } catch (error) {
    console.error("PATCH HISTORY ERROR:", error);
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
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const href = req.nextUrl.searchParams.get("href");
    if (!href) {
      return NextResponse.json(
        { success: false, message: "href required" },
        { status: 400 }
      );
    }

    await db.navigationHistory.deleteMany({
      where: { userId: user.id, href },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE HISTORY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
