import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import {
  ensureDefaultFavorites,
  loadFavoritesBundle,
} from "@/lib/favorites/server";

const colorSchema = z
  .enum(["blue", "green", "orange", "purple", "red", "gray"])
  .nullable()
  .optional();

const bundleSchema = z.object({
  version: z.literal(1).optional(),
  workspaces: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(80),
      sortOrder: z.number(),
      isActive: z.boolean(),
    })
  ),
  groups: z.array(
    z.object({
      id: z.string(),
      workspaceId: z.string(),
      name: z.string().min(1).max(80),
      color: colorSchema,
      sortOrder: z.number(),
    })
  ),
  items: z.array(
    z.object({
      id: z.string(),
      workspaceId: z.string(),
      groupId: z.string().nullable(),
      href: z.string().min(1).max(500),
      title: z.string().min(1).max(200),
      alias: z.string().max(200).nullable(),
      moduleKey: z.string().min(1).max(60),
      entityType: z.string().max(80).nullable().optional(),
      entityId: z.string().max(80).nullable().optional(),
      color: colorSchema,
      pinned: z.boolean(),
      sortOrder: z.number(),
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
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const bundle = await ensureDefaultFavorites(user.id, user.companyId);
    return NextResponse.json({ success: true, data: bundle });
  } catch (error) {
    console.error("GET FAVORITES ERROR:", error);
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
    const parsed = bundleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid favorites" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    await db.$transaction(async (tx) => {
      await tx.favoriteItem.deleteMany({ where: { userId: user.id } });
      await tx.favoriteGroup.deleteMany({ where: { userId: user.id } });
      await tx.favoriteWorkspace.deleteMany({ where: { userId: user.id } });

      if (data.workspaces.length) {
        await tx.favoriteWorkspace.createMany({
          data: data.workspaces.map((w) => ({
            id: w.id,
            companyId: user.companyId,
            userId: user.id,
            name: w.name,
            sortOrder: w.sortOrder,
            isActive: w.isActive,
          })),
        });
      }

      if (data.groups.length) {
        await tx.favoriteGroup.createMany({
          data: data.groups.map((g) => ({
            id: g.id,
            companyId: user.companyId,
            userId: user.id,
            workspaceId: g.workspaceId,
            name: g.name,
            color: g.color ?? null,
            sortOrder: g.sortOrder,
          })),
        });
      }

      if (data.items.length) {
        await tx.favoriteItem.createMany({
          data: data.items.map((i) => ({
            id: i.id,
            companyId: user.companyId,
            userId: user.id,
            workspaceId: i.workspaceId,
            groupId: i.groupId,
            href: i.href,
            title: i.title,
            alias: i.alias,
            moduleKey: i.moduleKey,
            entityType: i.entityType ?? null,
            entityId: i.entityId ?? null,
            color: i.color ?? null,
            pinned: i.pinned,
            sortOrder: i.sortOrder,
          })),
        });
      }
    });

    const bundle = await loadFavoritesBundle(user.id, user.companyId);
    return NextResponse.json({ success: true, data: bundle });
  } catch (error) {
    console.error("PUT FAVORITES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
