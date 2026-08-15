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

    const category = await db.category.findFirst({
      where: {
        id,
        companyId: user.companyId,
        deletedAt: null,
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "پۆل نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
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

    const body = await req.json();

    const { name, description, image } = body;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "تکایە ناوی پۆل بنووسە.",
        },
        {
          status: 400,
        }
      );
    }

    const category = await db.category.findFirst({
      where: {
        id,
        companyId: user.companyId,
        deletedAt: null,
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "پۆل نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    const exists = await db.category.findFirst({
      where: {
        companyId: user.companyId,
        name,
        NOT: {
          id,
        },
      },
    });

    if (exists) {
      return NextResponse.json(
        {
          success: false,
          message: "ئەم ناوی پۆلە پێشتر هەیە.",
        },
        {
          status: 409,
        }
      );
    }

    const updated = await db.category.update({
      where: {
        id: category.id,
      },
      data: {
        name,
        description,
        image: image || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "پۆل بە سەرکەوتوویی نوێکرایەوە.",
      data: updated,
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

    const category = await db.category.findFirst({
      where: {
        id,
        companyId: user.companyId,
        deletedAt: purge ? { not: null } : null,
      },
      include: { _count: { select: { suppliers: true } } },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "پۆل نەدۆزرایەوە.",
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
      if (!category.deletedAt) {
        return NextResponse.json(
          {
            success: false,
            message: "سەرەتا soft delete بکە، دواتر permanent delete.",
          },
          { status: 400 }
        );
      }
      if (category._count.suppliers > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "ناتوانرێت permanently بسڕدرێتەوە — دابینکەر پەیوەستە.",
          },
          { status: 400 }
        );
      }
      await db.category.delete({ where: { id } });
      await auditSafe({
        companyId: user.companyId,
        userId: user.id,
        module: "CATEGORY",
        action: "DELETE",
        entityType: "Category",
        entityId: category.id,
        summary: `پۆل permanent delete: ${category.name}`,
        oldValue: { name: category.name },
        metadata: { permanent: true },
        req,
      });
      return NextResponse.json({
        success: true,
        message: "پۆل بە هەمیشەیی سڕایەوە.",
        permanent: true,
      });
    }

    if (category.deletedAt) {
      return NextResponse.json(
        { success: false, message: "ئەم تۆمارە پێشتر گوازراوەتەوە بۆ سەبەتەی زبڵ." },
        { status: 400 }
      );
    }

    await db.category.update({
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
      module: "CATEGORY",
      action: "DELETE",
      entityType: "Category",
      entityId: category.id,
      summary: `پۆل soft delete: ${category.name}`,
      oldValue: { name: category.name, active: true },
      newValue: { active: false },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "پۆل سڕایەوە — Undo بەردەستە.",
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
