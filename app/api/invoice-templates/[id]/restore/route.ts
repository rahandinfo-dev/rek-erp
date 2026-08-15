import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { auditSafe } from "@/lib/audit/log";

type Props = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const template = await db.invoiceTemplate.findFirst({
      where: { id, companyId: user.companyId, deletedAt: { not: null } },
    });
    if (!template) {
      return NextResponse.json(
        { success: false, message: "قالب نەدۆزرایەوە." },
        { status: 404 }
      );
    }
    if (!template.deletedAt) {
      return NextResponse.json({ success: true, message: "قالبەکە چالاکە." });
    }

    const trashEntry = await db.recycleBinEntry.findFirst({
      where: {
        companyId: user.companyId,
        moduleKey: "invoice-templates",
        entityId: id,
        status: "deleted",
      },
      select: { metadata: true },
    });
    const previousValue =
      trashEntry?.metadata && typeof trashEntry.metadata === "object"
        ? (trashEntry.metadata as { previousValue?: { isDefault?: unknown } }).previousValue
        : null;
    if (typeof previousValue?.isDefault !== "boolean") {
      return NextResponse.json(
        { success: false, message: "دۆخی پێشووی قالبەکە نەدۆزرایەوە؛ گەڕاندنەوە وەستێنرا بۆ پاراستنی داتا." },
        { status: 409 }
      );
    }
    const previousIsDefault = previousValue.isDefault;

    await db.$transaction(async (tx) => {
      if (previousIsDefault) {
        await tx.invoiceTemplate.updateMany({
          where: { companyId: user.companyId, deletedAt: null, isDefault: true },
          data: { isDefault: false },
        });
      }
      await tx.invoiceTemplate.update({
        where: { id },
        data: {
          isDefault: previousIsDefault,
          deletedAt: null,
          deletedById: null,
        },
      });
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "INVOICE",
      action: "RESTORE",
      entityType: "InvoiceTemplate",
      entityId: id,
      summary: `Invoice template restored: ${template.name}`,
      req,
    });

    return NextResponse.json({ success: true, message: "قالبەکە گەڕێنرایەوە." });
  } catch (error) {
    console.error("RESTORE INVOICE TEMPLATE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
