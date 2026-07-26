import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { ensureDefaultRules } from "@/lib/numbering/engine";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await ensureDefaultRules(user.companyId);
    const companyId = user.companyId;

    const [rulesEnabled, counters, dupSkus, dupBarcodes] = await Promise.all([
      db.numberingRule.count({ where: { companyId, enabled: true } }),
      db.numberingCounter.findMany({
        where: { companyId },
        select: { moduleKey: true, periodKey: true, nextValue: true },
      }),
      db.$queryRaw<Array<{ sku: string; c: bigint }>>`
        SELECT sku, COUNT(*)::bigint AS c
        FROM "Product"
        WHERE "companyId" = ${companyId}
        GROUP BY sku
        HAVING COUNT(*) > 1
        LIMIT 10
      `.catch(() => [] as Array<{ sku: string; c: bigint }>),
      db.$queryRaw<Array<{ barcode: string; c: bigint }>>`
        SELECT barcode, COUNT(*)::bigint AS c
        FROM "Product"
        WHERE "companyId" = ${companyId} AND barcode IS NOT NULL AND barcode <> ''
        GROUP BY barcode
        HAVING COUNT(*) > 1
        LIMIT 10
      `.catch(() => [] as Array<{ barcode: string; c: bigint }>),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        rulesEnabled,
        countersIssued: counters.reduce(
          (sum, c) => sum + Math.max(0, c.nextValue - 1),
          0
        ),
        counters: counters.map((c) => ({
          moduleKey: c.moduleKey,
          periodKey: c.periodKey,
          nextValue: c.nextValue,
        })),
        duplicateAlerts: [
          ...dupSkus.map((d) => ({
            type: "sku" as const,
            value: d.sku,
            count: Number(d.c),
          })),
          ...dupBarcodes.map((d) => ({
            type: "barcode" as const,
            value: d.barcode,
            count: Number(d.c),
          })),
        ],
      },
    });
  } catch (error) {
    console.error("NUMBERING STATS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
