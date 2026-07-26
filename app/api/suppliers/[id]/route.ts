import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import {
  getCurrentCompanyId,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { supplierSchema } from "@/lib/validators/supplier";
import { auditSafe } from "@/lib/audit/log";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  req: NextRequest,
  { params }: Props
) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          message: "تکایە سەرەتا بچۆ ژوورەوە.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await params;

    const supplier = await db.supplier.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        {
          success: false,
          message: "دابینکەر نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error("GET SUPPLIER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "هەڵەیەک ڕوویدا.",
      },
      {
        status: 500,
      }
    );
  }
}
export async function PUT(
  req: NextRequest,
  { params }: Props
) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          message: "تکایە سەرەتا بچۆ ژوورەوە.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await params;

    const body = await req.json();

    const validation = supplierSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          errors: validation.error.flatten(),
        },
        {
          status: 400,
        }
      );
    }

    const data = validation.data;

    const supplier = await db.supplier.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        {
          success: false,
          message: "دابینکەر نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    const codeExists = await db.supplier.findFirst({
      where: {
        companyId,
        code: data.code,
        NOT: {
          id,
        },
      },
    });

    if (codeExists) {
      return NextResponse.json(
        {
          success: false,
          message: "ئەم کۆدە پێشتر بەکارهاتووە.",
        },
        {
          status: 400,
        }
      );
    }

    const updatedSupplier = await db.supplier.update({
      where: {
        id,
      },
      data: {
        name: data.name,
        code: data.code,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
        image: data.image || null,
        active: data.active,
      },
    });

    const user = await getCurrentUser();
    await auditSafe({
      companyId,
      userId: user?.id,
      module: "SUPPLIER",
      action: "UPDATE",
      entityType: "دابینکەر",
      entityId: updatedSupplier.id,
      summary: `دابینکەر نوێکرایەوە: ${updatedSupplier.name}`,
      oldValue: {
        name: supplier.name,
        code: supplier.code,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        notes: supplier.notes,
        active: supplier.active,
      },
      newValue: {
        name: updatedSupplier.name,
        code: updatedSupplier.code,
        phone: updatedSupplier.phone,
        email: updatedSupplier.email,
        address: updatedSupplier.address,
        notes: updatedSupplier.notes,
        active: updatedSupplier.active,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      data: updatedSupplier,
      message: "دابینکەر بە سەرکەوتوویی نوێکرایەوە.",
    });
  } catch (error) {
    console.error("UPDATE SUPPLIER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "هەڵەیەک ڕوویدا.",
      },
      {
        status: 500,
      }
    );
  }
}
export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          message: "تکایە سەرەتا بچۆ ژوورەوە.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await params;
    const purge = req.nextUrl.searchParams.get("purge") === "1";

    const supplier = await db.supplier.findFirst({
      where: {
        id,
        companyId,
      },
      include: { _count: { select: { purchases: true } } },
    });

    if (!supplier) {
      return NextResponse.json(
        {
          success: false,
          message: "دابینکەر نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    if (purge) {
      if (supplier.active) {
        return NextResponse.json(
          {
            success: false,
            message: "سەرەتا soft delete بکە، دواتر permanent delete.",
          },
          { status: 400 }
        );
      }
      if (supplier._count.purchases > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "ناتوانرێت permanently بسڕدرێتەوە — مێژووی کڕین هەیە.",
          },
          { status: 400 }
        );
      }
      await db.supplier.delete({ where: { id } });
      await auditSafe({
        companyId,
        module: "SUPPLIER",
        action: "DELETE",
        entityType: "دابینکەر",
        entityId: supplier.id,
        summary: `دابینکەر permanent delete: ${supplier.name}`,
        oldValue: { name: supplier.name, code: supplier.code },
        metadata: { permanent: true },
        req,
      });
      return NextResponse.json({
        success: true,
        message: "دابینکەر بە هەمیشەیی سڕایەوە.",
        permanent: true,
      });
    }

    if (!supplier.active) {
      return NextResponse.json(
        { success: false, message: "ئەم دابینکەرە پێشتر soft delete کراوە." },
        { status: 400 }
      );
    }

    await db.supplier.update({
      where: { id },
      data: { active: false },
    });

    await auditSafe({
      companyId,
      module: "SUPPLIER",
      action: "DELETE",
      entityType: "دابینکەر",
      entityId: supplier.id,
      summary: `دابینکەر soft delete: ${supplier.name}`,
      oldValue: { active: true, name: supplier.name, code: supplier.code },
      newValue: { active: false },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "دابینکەر soft delete کرا — Undo بەردەستە · مێژوو پارێزراوە.",
      soft: true,
    });
  } catch (error) {
    console.error("DELETE SUPPLIER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "هەڵەیەک ڕوویدا.",
      },
      {
        status: 500,
      }
    );
  }
}
