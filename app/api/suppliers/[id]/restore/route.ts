import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { auditSafe } from "@/lib/audit/log";

type Props = { params: Promise<{ id: string }> };

/** Restore a soft-deleted supplier. */
export async function POST(_req: NextRequest, { params }: Props) {
  try {
    const companyId = await getCurrentCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const supplier = await db.supplier.findFirst({
      where: { id, companyId },
      select: { id: true, name: true, active: true },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "دابینکەر نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (supplier.active) {
      return NextResponse.json(
        { success: false, message: "ئەم دابینکەرە چالاکە." },
        { status: 400 }
      );
    }

    await db.supplier.update({
      where: { id },
      data: { active: true },
    });

    await auditSafe({
      companyId,
      module: "SUPPLIER",
      action: "RESTORE",
      entityType: "دابینکەر",
      entityId: supplier.id,
      summary: `دابینکەر گەڕێنرایەوە: ${supplier.name}`,
      oldValue: { active: false },
      newValue: { active: true, name: supplier.name },
      req: _req,
    });

    return NextResponse.json({
      success: true,
      message: "دابینکەر گەڕێنرایەوە.",
    });
  } catch (error) {
    console.error("RESTORE SUPPLIER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
