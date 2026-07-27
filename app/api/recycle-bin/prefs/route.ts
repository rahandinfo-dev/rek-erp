import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { RETENTION_OPTIONS } from "@/lib/recycle/types";
import { getRetentionDays } from "@/lib/recycle/record";
import { auditSafe } from "@/lib/audit/log";
import { tServer } from "@/lib/i18n";

const schema = z.object({
  retentionDays: z.number().refine((n) =>
    (RETENTION_OPTIONS as readonly number[]).includes(n)
  ),
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
    const retentionDays = await getRetentionDays(user.companyId, user.id);
    return NextResponse.json({
      success: true,
      data: { retentionDays, retentionOptions: RETENTION_OPTIONS },
    });
  } catch (error) {
    console.error("RECYCLE PREFS GET ERROR:", error);
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
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.invalidRetentionDays") },
        { status: 400 }
      );
    }

    const prefs = await db.recycleBinPrefs.upsert({
      where: { userId: user.id },
      create: {
        companyId: user.companyId,
        userId: user.id,
        retentionDays: parsed.data.retentionDays,
      },
      update: { retentionDays: parsed.data.retentionDays },
    });

    // Refresh expiresAt for active deleted rows for this company (bounded)
    const deleted = await db.recycleBinEntry.findMany({
      where: { companyId: user.companyId, status: "deleted" },
      select: { id: true, deletedAt: true },
      take: 500,
    });
    for (const row of deleted) {
      await db.recycleBinEntry.update({
        where: { id: row.id },
        data: {
          expiresAt: new Date(
            row.deletedAt.getTime() + prefs.retentionDays * 86400000
          ),
        },
      });
    }

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "SETTINGS",
      action: "UPDATE",
      entityType: "RecycleBinPrefs",
      entityId: prefs.id,
      summary: `Recycle Bin retention set to ${prefs.retentionDays} days`,
      newValue: { retentionDays: prefs.retentionDays },
      req,
    });

    return NextResponse.json({
      success: true,
      data: { retentionDays: prefs.retentionDays },
    });
  } catch (error) {
    console.error("RECYCLE PREFS PATCH ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
