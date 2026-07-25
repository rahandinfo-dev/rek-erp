import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import {
  getCurrentCompanyId,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { customerSchema } from "@/lib/validators/customer";
import { auditSafe } from "@/lib/audit/log";

type Props = {
  params: Promise<{ id: string }>;
};

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

    const customer = await db.customer.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        name: true,
        code: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        active: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "کڕیار نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    console.error("GET CUSTOMER ERROR:", error);
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
    const validation = customerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    const customer = await db.customer.findFirst({
      where: { id, companyId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "کڕیار نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    const codeExists = await db.customer.findFirst({
      where: {
        companyId,
        code: data.code,
        NOT: { id },
      },
    });

    if (codeExists) {
      return NextResponse.json(
        { success: false, message: "ئەم کۆدە پێشتر بەکارهاتووە." },
        { status: 400 }
      );
    }

    const updated = await db.customer.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
        active: data.active,
      },
    });

    const user = await getCurrentUser();
    await auditSafe({
      companyId,
      userId: user?.id,
      module: "CUSTOMER",
      action: "UPDATE",
      entityType: "Customer",
      entityId: updated.id,
      summary: `کڕیار نوێکرایەوە: ${updated.name}`,
      oldValue: {
        name: customer.name,
        code: customer.code,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        notes: customer.notes,
        active: customer.active,
      },
      newValue: {
        name: updated.name,
        code: updated.code,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        notes: updated.notes,
        active: updated.active,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "کڕیار بە سەرکەوتوویی نوێکرایەوە.",
    });
  } catch (error) {
    console.error("UPDATE CUSTOMER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const purge = req.nextUrl.searchParams.get("purge") === "1";

    const customer = await db.customer.findFirst({
      where: { id, companyId },
      include: { _count: { select: { sales: true, invoices: true } } },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "کڕیار نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    // Permanent delete later — only when already soft-deleted and history-safe.
    if (purge) {
      if (customer.active) {
        return NextResponse.json(
          {
            success: false,
            message: "سەرەتا soft delete بکە، دواتر permanent delete.",
          },
          { status: 400 }
        );
      }
      if (customer._count.sales > 0 || customer._count.invoices > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "ناتوانرێت permanently بسڕدرێتەوە — مێژووی فرۆشتن/پسوولە هەیە.",
          },
          { status: 400 }
        );
      }
      await db.customer.delete({ where: { id } });
      await auditSafe({
        companyId,
        module: "CUSTOMER",
        action: "DELETE",
        entityType: "Customer",
        entityId: customer.id,
        summary: `کڕیار permanent delete: ${customer.name}`,
        oldValue: { name: customer.name, code: customer.code },
        metadata: { permanent: true },
        req,
      });
      return NextResponse.json({
        success: true,
        message: "کڕیار بە هەمیشەیی سڕایەوە.",
        permanent: true,
      });
    }

    if (!customer.active) {
      return NextResponse.json(
        { success: false, message: "ئەم کڕیارە پێشتر soft delete کراوە." },
        { status: 400 }
      );
    }

    // Soft delete first — related sales/invoices history stays.
    await db.customer.update({
      where: { id },
      data: { active: false },
    });

    await auditSafe({
      companyId,
      module: "CUSTOMER",
      action: "DELETE",
      entityType: "Customer",
      entityId: customer.id,
      summary: `کڕیار soft delete: ${customer.name}`,
      oldValue: { active: true, name: customer.name, code: customer.code },
      newValue: { active: false },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "کڕیار soft delete کرا — Undo بەردەستە · مێژوو پارێزراوە.",
      soft: true,
    });
  } catch (error) {
    console.error("DELETE CUSTOMER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
