import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
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

    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const [total, week, byStatus, byAction] = await Promise.all([
      db.bulkJob.count({ where: { companyId: user.companyId } }),
      db.bulkJob.count({
        where: { companyId: user.companyId, createdAt: { gte: weekAgo } },
      }),
      db.bulkJob.groupBy({
        by: ["status"],
        where: { companyId: user.companyId },
        _count: { _all: true },
      }),
      db.bulkJob.groupBy({
        by: ["action"],
        where: { companyId: user.companyId },
        _count: { _all: true },
      }),
    ]);

    const successRecords = await db.bulkJob.aggregate({
      where: { companyId: user.companyId },
      _sum: { successCount: true, failedCount: true, totalCount: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        total,
        week,
        recordsTouched: successRecords._sum.totalCount || 0,
        recordsSucceeded: successRecords._sum.successCount || 0,
        recordsFailed: successRecords._sum.failedCount || 0,
        byStatus: byStatus.map((s) => ({
          status: s.status,
          count: s._count._all,
        })),
        byAction: byAction.map((a) => ({
          action: a.action,
          count: a._count._all,
        })),
      },
    });
  } catch (error) {
    console.error("BULK STATS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
