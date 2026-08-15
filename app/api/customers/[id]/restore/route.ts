import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { auditSafe } from "@/lib/audit/log";

type Props = { params: Promise<{ id: string }> };

/** Restore a soft-deleted customer. */
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
    const customer = await db.customer.findFirst({
      where: { id, companyId, deletedAt: { not: null } },
      select: { id: true, name: true, active: true, deletedAt: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "کڕیار نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (!customer.deletedAt) {
      return NextResponse.json(
        { success: false, message: "ئەم کڕیارە چالاکە." },
        { status: 400 }
      );
    }

    await db.customer.update({
      where: { id },
      data: { active: true, deletedAt: null, deletedById: null },
    });

    await auditSafe({
      companyId,
      module: "CUSTOMER",
      action: "RESTORE",
      entityType: "کڕیار",
      entityId: customer.id,
      summary: `کڕیار گەڕێنرایەوە: ${customer.name}`,
      oldValue: { active: false },
      newValue: { active: true, name: customer.name },
      req: _req,
    });

    return NextResponse.json({
      success: true,
      message: "کڕیار گەڕێنرایەوە.",
    });
  } catch (error) {
    console.error("RESTORE CUSTOMER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
