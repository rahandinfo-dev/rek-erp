import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/current-user";
import { invoiceTemplateSchema } from "@/lib/validators/invoice-template";
import { isCompanyAdministrator } from "@/lib/auth/authorization";
import { auditSafe } from "@/lib/audit/log";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const companyId = await getCurrentCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const template = await db.invoiceTemplate.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, message: "قاڵب نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error("GET TEMPLATE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Props) {
  try {
    const companyId = await getCurrentCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const validation = invoiceTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.invoiceTemplate.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "قاڵب نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    const data = validation.data;

    const nameTaken = await db.invoiceTemplate.findFirst({
      where: {
        companyId,
        name: data.name,
        NOT: { id },
      },
    });

    if (nameTaken) {
      return NextResponse.json(
        { success: false, message: "ئەم ناوی قاڵبە پێشتر هەیە." },
        { status: 400 }
      );
    }

    const template = await db.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.invoiceTemplate.updateMany({
          where: { companyId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }

      return tx.invoiceTemplate.update({
        where: { id },
        data: {
          name: data.name,
          size: data.size,
          docType: data.docType,
          isDefault: data.isDefault,
          config: data.config,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: template,
      message: "قاڵب نوێکرایەوە.",
    });
  } catch (error) {
    console.error("UPDATE TEMPLATE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const companyId = user.companyId;
    const { id } = await params;
    const purge = _req.nextUrl.searchParams.get("purge") === "1";
    const existing = await db.invoiceTemplate.findFirst({
      where: { id, companyId, deletedAt: purge ? { not: null } : null },
      include: { _count: { select: { invoices: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "قاڵب نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (purge) {
      if (!(await isCompanyAdministrator(companyId, user.id))) {
        return NextResponse.json(
          { success: false, message: "تەنها بەڕێوەبەری کۆمپانیا دەتوانێت بە هەمیشەیی بیسڕێتەوە." },
          { status: 403 }
        );
      }
      if (!existing.deletedAt) {
        return NextResponse.json(
          { success: false, message: "سەرەتا قالبەکە بگوازەرەوە بۆ سەبەتەی زبڵ." },
          { status: 400 }
        );
      }
      if (existing._count.invoices > 0) {
        return NextResponse.json(
          { success: false, message: "ناتوانرێت بە هەمیشەیی بسڕدرێتەوە، لەبەر ئەوەی پسوولەی پێوە بەستراوە" },
          { status: 400 }
        );
      }
      await db.invoiceTemplate.delete({ where: { id } });
      await auditSafe({
        companyId,
        userId: user.id,
        module: "INVOICE",
        action: "DELETE",
        entityType: "InvoiceTemplate",
        entityId: existing.id,
        summary: `Invoice template permanently deleted: ${existing.name}`,
        oldValue: { name: existing.name, isDefault: existing.isDefault },
        metadata: { permanent: true },
        req: _req,
      });
      return NextResponse.json({ success: true, permanent: true });
    }

    if (existing.deletedAt) {
      return NextResponse.json(
        { success: false, message: "ئەم قالبە پێشتر گوازراوەتەوە بۆ سەبەتەی زبڵ." },
        { status: 400 }
      );
    }

    await db.invoiceTemplate.update({
      where: { id },
      data: { isDefault: false, deletedAt: new Date(), deletedById: user.id },
    });

    if (existing.isDefault) {
      const next = await db.invoiceTemplate.findFirst({
        where: { companyId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
      });
      if (next) {
        await db.invoiceTemplate.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    await auditSafe({
      companyId,
      userId: user.id,
      module: "INVOICE",
      action: "DELETE",
      entityType: "InvoiceTemplate",
      entityId: existing.id,
      summary: `Invoice template moved to trash: ${existing.name}`,
      oldValue: { name: existing.name, isDefault: existing.isDefault },
      newValue: { deletedAt: true },
      req: _req,
    });

    return NextResponse.json({
      success: true,
      message: "قاڵب سڕایەوە.",
    });
  } catch (error) {
    console.error("DELETE TEMPLATE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
