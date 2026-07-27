import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { purgeUrlFor } from "@/lib/recycle/map";
import { tServer } from "@/lib/i18n";
import {
  purgeBlockedByRelated,
  relatedForEntity,
} from "@/lib/recycle/related";
import { auditSafe } from "@/lib/audit/log";
import { recordRecyclePurged } from "@/lib/recycle/record";

const schema = z.object({
  confirm: z.literal(true),
  confirmPhrase: z.literal("EMPTY"),
});

export async function POST(req: NextRequest) {
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
        {
          success: false,
          message: 'Type EMPTY and confirm: true to empty the bin',
        },
        { status: 400 }
      );
    }

    const entries = await db.recycleBinEntry.findMany({
      where: { companyId: user.companyId, status: "deleted" },
      take: 200,
    });

    const cookie = req.headers.get("cookie") || "";
    let purged = 0;
    let skipped = 0;

    for (const entry of entries) {
      const related = await relatedForEntity(
        user.companyId,
        entry.moduleKey,
        entry.entityId
      );
      if (purgeBlockedByRelated(entry.moduleKey, related)) {
        skipped += 1;
        continue;
      }
      const api = purgeUrlFor(entry.moduleKey, entry.entityId);
      if (!api) {
        skipped += 1;
        continue;
      }
      try {
        const res = await fetch(new URL(api, req.url).toString(), {
          method: "DELETE",
          headers: { cookie, "content-type": "application/json" },
        });
        if (res.ok) {
          await recordRecyclePurged({
            companyId: user.companyId,
            entityType: entry.entityType,
            entityId: entry.entityId,
          });
          purged += 1;
        } else {
          skipped += 1;
        }
      } catch {
        skipped += 1;
      }
    }

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "SYSTEM",
      action: "DELETE",
      entityType: "RecycleBin",
      summary: `Empty Recycle Bin · purged ${purged}, skipped ${skipped}`,
      metadata: { purged, skipped, permanent: true },
      req,
    });

    return NextResponse.json({
      success: true,
      data: { purged, skipped, total: entries.length },
    });
  } catch (error) {
    console.error("RECYCLE EMPTY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
