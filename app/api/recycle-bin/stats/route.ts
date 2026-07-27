import { NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { syncRecycleBinFromDb } from "@/lib/recycle/sync";
import { getRetentionDays } from "@/lib/recycle/record";
import { tServer } from "@/lib/i18n";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const { companyId, id: userId } = user;
    await syncRecycleBinFromDb(companyId, userId);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const soon = new Date(now.getTime() + 7 * 86400000);

    const [
      deleted,
      restored,
      purged,
      recent,
      expiringSoon,
      byModule,
      retentionDays,
    ] = await Promise.all([
      db.recycleBinEntry.count({
        where: { companyId, status: "deleted" },
      }),
      db.recycleBinEntry.count({
        where: { companyId, status: "restored" },
      }),
      db.recycleBinEntry.count({
        where: { companyId, status: "purged" },
      }),
      db.recycleBinEntry.count({
        where: {
          companyId,
          status: "deleted",
          deletedAt: { gte: weekAgo },
        },
      }),
      db.recycleBinEntry.count({
        where: {
          companyId,
          status: "deleted",
          expiresAt: { lte: soon, gte: now },
        },
      }),
      db.recycleBinEntry.groupBy({
        by: ["moduleKey"],
        where: { companyId, status: "deleted" },
        _count: { _all: true },
      }),
      getRetentionDays(companyId, userId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        deleted,
        restored,
        purged,
        recent,
        expiringSoon,
        retentionDays,
        byModule: byModule.map((m) => ({
          moduleKey: m.moduleKey,
          count: m._count._all,
        })),
      },
    });
  } catch (error) {
    console.error("RECYCLE BIN STATS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
