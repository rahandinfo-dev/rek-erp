import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { syncRecycleBinFromDb } from "@/lib/recycle/sync";
import { autoPurgeExpired } from "@/lib/recycle/purge";
import { serializeRecycleEntry } from "@/lib/recycle/serialize";
import { relatedForEntity } from "@/lib/recycle/related";
import { getRetentionDays } from "@/lib/recycle/record";
import { RETENTION_OPTIONS } from "@/lib/recycle/types";
import type { Prisma } from "@/lib/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { companyId, id: userId } = user;
    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") || "").trim();
    const moduleKey = sp.get("module") || "all";
    const status = sp.get("status") || "deleted";
    const sort = sp.get("sort") || "newest";
    const page = Math.max(1, Number(sp.get("page") || 1));
    const pageSize = Math.min(50, Math.max(10, Number(sp.get("pageSize") || 30)));
    const cursor = sp.get("cursor");
    const withRelated = sp.get("related") === "1";
    const skipSync = sp.get("skipSync") === "1";

    if (!skipSync) {
      await syncRecycleBinFromDb(companyId, userId);
      void autoPurgeExpired(companyId, {
        cookie: req.headers.get("cookie") || "",
        origin: req.nextUrl.origin,
        limit: 10,
      });
    }

    const where: Prisma.RecycleBinEntryWhereInput = {
      companyId,
      ...(status !== "all" ? { status } : {}),
      ...(moduleKey !== "all" ? { moduleKey } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { entityType: { contains: q, mode: "insensitive" } },
              { reason: { contains: q, mode: "insensitive" } },
              { userName: { contains: q, mode: "insensitive" } },
              { moduleKey: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.RecycleBinEntryOrderByWithRelationInput =
      sort === "oldest"
        ? { deletedAt: "asc" }
        : sort === "expires"
          ? { expiresAt: "asc" }
          : sort === "name"
            ? { name: "asc" }
            : sort === "module"
              ? { moduleKey: "asc" }
              : { deletedAt: "desc" };

    const [total, rows, retentionDays] = await Promise.all([
      db.recycleBinEntry.count({ where }),
      db.recycleBinEntry.findMany({
        where,
        orderBy,
        take: pageSize,
        ...(cursor
          ? { skip: 1, cursor: { id: cursor } }
          : { skip: (page - 1) * pageSize }),
      }),
      getRetentionDays(companyId, userId),
    ]);

    const items = await Promise.all(
      rows.map(async (row) => {
        const related = withRelated
          ? await relatedForEntity(companyId, row.moduleKey, row.entityId)
          : undefined;
        return serializeRecycleEntry(row, related);
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total || (cursor ? rows.length === pageSize : false),
        nextCursor: rows.length ? rows[rows.length - 1].id : null,
        retentionDays,
        retentionOptions: RETENTION_OPTIONS,
      },
    });
  } catch (error) {
    console.error("RECYCLE BIN LIST ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
