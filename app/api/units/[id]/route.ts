import { NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { auditSafe } from "@/lib/audit/log";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: Params
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    const unit = await db.unit.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!unit) {
      return NextResponse.json(
        {
          success: false,
          message: "یەکە نەدۆزرایەوە.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: unit,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Server Error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: Params
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const name = String(body.name || "").trim();
    const symbol = String(body.symbol || "").trim();
    const active = body.active !== false;

    if (!name || !symbol) {
      return NextResponse.json(
        {
          success: false,
          message: "ناوی یەکە و کورتکراوەکەی پێویستن.",
        },
        { status: 400 }
      );
    }

    const unit = await db.unit.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!unit) {
      return NextResponse.json(
        {
          success: false,
          message: "یەکە نەدۆزرایەوە.",
        },
        { status: 404 }
      );
    }

    const existingName = await db.unit.findFirst({
      where: {
        companyId: user.companyId,
        name,
        NOT: {
          id,
        },
      },
    });

    if (existingName) {
      return NextResponse.json(
        {
          success: false,
          message: "ئەم ناوی یەکەیە پێشتر هەیە.",
        },
        { status: 400 }
      );
    }

    const existingSymbol = await db.unit.findFirst({
      where: {
        companyId: user.companyId,
        symbol,
        NOT: {
          id,
        },
      },
    });

    if (existingSymbol) {
      return NextResponse.json(
        {
          success: false,
          message: "ئەم کورتکراوەیە پێشتر هەیە.",
        },
        { status: 400 }
      );
    }

    const updatedUnit = await db.unit.update({
      where: {
        id,
      },
      data: {
        name,
        symbol,
        active,
      },
    });

    return NextResponse.json({
      success: true,
      message: "یەکەکە نوێکرایەوە.",
      data: updatedUnit,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Server Error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: Params
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const url = new URL(request.url);
    const purge = url.searchParams.get("purge") === "1";

    const unit = await db.unit.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        products: true,
      },
    });

    if (!unit) {
      return NextResponse.json(
        {
          success: false,
          message: "یەکە نەدۆزرایەوە.",
        },
        { status: 404 }
      );
    }

    if (purge) {
      if (unit.active) {
        return NextResponse.json(
          {
            success: false,
            message: "سەرەتا soft delete بکە، دواتر permanent delete.",
          },
          { status: 400 }
        );
      }
      if (unit.products.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "ناتوانرێت permanently بسڕدرێتەوە — بەرهەم پەیوەستە.",
          },
          { status: 400 }
        );
      }
      await db.unit.delete({ where: { id } });
      await auditSafe({
        companyId: user.companyId,
        userId: user.id,
        module: "UNIT",
        action: "DELETE",
        entityType: "Unit",
        entityId: unit.id,
        summary: `یەکە permanent delete: ${unit.name}`,
        oldValue: { name: unit.name, symbol: unit.symbol },
        metadata: { permanent: true },
      });
      return NextResponse.json({
        success: true,
        message: "یەکە بە هەمیشەیی سڕایەوە.",
        permanent: true,
      });
    }

    await db.unit.update({
      where: { id },
      data: { active: false },
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "UNIT",
      action: "DELETE",
      entityType: "Unit",
      entityId: unit.id,
      summary: `یەکە soft delete: ${unit.name}`,
      oldValue: { name: unit.name, symbol: unit.symbol, active: true },
      newValue: { active: false },
    });

    return NextResponse.json({
      success: true,
      message:
        unit.products.length > 0
          ? "یەکە ئەرشیفکرا — Undo بەردەستە."
          : "یەکە سڕایەوە — Undo بەردەستە.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Server Error",
      },
      { status: 500 }
    );
  }
}