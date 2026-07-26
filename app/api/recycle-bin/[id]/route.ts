import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { serializeRecycleEntry } from "@/lib/recycle/serialize";
import { relatedForEntity } from "@/lib/recycle/related";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const row = await db.recycleBinEntry.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!row) {
      return NextResponse.json(
        { success: false, message: "نەدۆزرایەوە" },
        { status: 404 }
      );
    }

    const related = await relatedForEntity(
      user.companyId,
      row.moduleKey,
      row.entityId
    );

    return NextResponse.json({
      success: true,
      data: serializeRecycleEntry(row, related),
    });
  } catch (error) {
    console.error("RECYCLE DETAIL ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
