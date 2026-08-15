import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { auditSafe } from "@/lib/audit/log";
import { isCompanyAdministrator } from "@/lib/auth/authorization";

type Params = Promise<{
  id: string;
}>;
export async function GET(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "دەستڕاگەیشتن ڕێگەپێنەدراوە.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await params;

    const brand = await db.brand.findFirst({
      where: {
        id,
        companyId: user.companyId,
        deletedAt: null,
      },
    });

    if (!brand) {
      return NextResponse.json(
        {
          success: false,
          message: "براند نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: brand,
    });
  } catch (error) {
    console.error(error);

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
  { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "دەستڕاگەیشتن ڕێگەپێنەدراوە.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await params;

    const { name } = await req.json();

const brandName = name?.trim();

    if (!brandName) {
      return NextResponse.json(
        {
          success: false,
          message: "تکایە ناوی براند بنووسە.",
        },
        {
          status: 400,
        }
      );
    }

    const brand = await db.brand.findFirst({
      where: {
        id,
        companyId: user.companyId,
        deletedAt: null,
      },
    });

    if (!brand) {
      return NextResponse.json(
        {
          success: false,
          message: "براند نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    const exists = await db.brand.findFirst({
      where: {
        companyId: user.companyId,
        name: brandName,
        NOT: {
          id,
        },
      },
    });

    if (exists) {
      return NextResponse.json(
        {
          success: false,
          message: "ئەم ناوی براندە پێشتر هەیە.",
        },
        {
          status: 409,
        }
      );
    }

    const updatedBrand = await db.brand.update({
      where: {
        id,
      },
      data: {
        name: brandName,
      },
    });

    return NextResponse.json({
      success: true,
      message: "براند بە سەرکەوتوویی نوێکرایەوە.",
      data: updatedBrand,
    });
  } catch (error) {
    console.error(error);

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
export async function DELETE(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "دەستڕاگەیشتن ڕێگەپێنەدراوە.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await params;

    const purge = req.nextUrl.searchParams.get("purge") === "1";

    const brand = await db.brand.findFirst({
      where: {
        id,
        companyId: user.companyId,
        deletedAt: purge ? { not: null } : null,
      },
    });

    if (!brand) {
      return NextResponse.json(
        {
          success: false,
          message: "براند نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    if (purge) {
      if (!(await isCompanyAdministrator(user.companyId, user.id))) {
        return NextResponse.json(
          { success: false, message: "تەنها بەڕێوەبەری کۆمپانیا دەتوانێت بە هەمیشەیی بسڕێتەوە." },
          { status: 403 }
        );
      }
      if (!brand.deletedAt) {
        return NextResponse.json(
          {
            success: false,
            message: "سەرەتا soft delete بکە، دواتر permanent delete.",
          },
          { status: 400 }
        );
      }
      await db.brand.delete({ where: { id } });
      await auditSafe({
        companyId: user.companyId,
        userId: user.id,
        module: "BRAND",
        action: "DELETE",
        entityType: "Brand",
        entityId: brand.id,
        summary: `براند permanent delete: ${brand.name}`,
        oldValue: { name: brand.name },
        metadata: { permanent: true },
        req,
      });
      return NextResponse.json({
        success: true,
        message: "براند بە هەمیشەیی سڕایەوە.",
        permanent: true,
      });
    }

    if (brand.deletedAt) {
      return NextResponse.json(
        { success: false, message: "ئەم تۆمارە پێشتر گوازراوەتەوە بۆ سەبەتەی زبڵ." },
        { status: 400 }
      );
    }

    await db.brand.update({
      where: {
        id,
      },
      data: {
        active: false,
        deletedAt: new Date(),
        deletedById: user.id,
      },
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "BRAND",
      action: "DELETE",
      entityType: "Brand",
      entityId: brand.id,
      summary: `براند soft delete: ${brand.name}`,
      oldValue: { name: brand.name, active: true },
      newValue: { active: false },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "براند سڕایەوە — Undo بەردەستە.",
    });
  } catch (error) {
    console.error(error);

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
