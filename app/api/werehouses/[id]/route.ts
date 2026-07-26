import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { notifySafe } from "@/lib/notifications/create";
import { auditSafe } from "@/lib/audit/log";

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

    const warehouse = await db.warehouse.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        {
          success: false,
          message: "کۆگا نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: warehouse,
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

    const { name, code, address, isMain, capacity } = body;

    if (!name || !code) {
      return NextResponse.json(
        {
          success: false,
          message: "تکایە هەموو خانە گرنگەکان پڕبکەرەوە.",
        },
        {
          status: 400,
        }
      );
    }

    const capacityValue =
      capacity === "" || capacity == null
        ? null
        : Number.isFinite(Number(capacity)) && Number(capacity) >= 0
          ? Number(capacity)
          : null;

    const warehouse = await db.warehouse.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        {
          success: false,
          message: "کۆگا نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    if (isMain) {
      await db.warehouse.updateMany({
        where: {
          companyId: user.companyId,
          isMain: true,
        },
        data: {
          isMain: false,
        },
      });
    }

    const updated = await db.warehouse.update({
      where: {
        id,
      },
      data: {
        name,
        code,
        address,
        isMain,
        capacity: capacityValue,
      },
    });

    await notifySafe({
      companyId: user.companyId,
      title: "کۆگا نوێکرایەوە",
      message: `${updated.name} (${updated.code}) نوێکرایەوە.`,
      category: "WAREHOUSE",
      priority: "NORMAL",
      href: `/dashboard/werehouse/${updated.id}`,
      entityType: "کۆگا",
      entityId: updated.id,
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "WAREHOUSE",
      action: "UPDATE",
      entityType: "کۆگا",
      entityId: updated.id,
      summary: `کۆگای ${updated.name} نوێکرایەوە`,
      oldValue: {
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address,
        isMain: warehouse.isMain,
        active: warehouse.active,
      },
      newValue: {
        name: updated.name,
        code: updated.code,
        address: updated.address,
        isMain: updated.isMain,
        active: updated.active,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "کۆگا بە سەرکەوتوویی نوێکرایەوە.",
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

    const warehouse = await db.warehouse.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        _count: {
          select: {
            sales: true,
            purchases: true,
            invoices: true,
            warehouseStocks: true,
          },
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        {
          success: false,
          message: "کۆگا نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    if (purge) {
      if (warehouse.active) {
        return NextResponse.json(
          {
            success: false,
            message: "سەرەتا soft delete بکە، دواتر permanent delete.",
          },
          { status: 400 }
        );
      }
      if (warehouse.isMain) {
        return NextResponse.json(
          {
            success: false,
            message: "ناتوانیت کۆگای سەرەکی بە هەمیشەیی بسڕیتەوە.",
          },
          { status: 400 }
        );
      }
      if (
        warehouse._count.sales > 0 ||
        warehouse._count.purchases > 0 ||
        warehouse._count.invoices > 0 ||
        warehouse._count.warehouseStocks > 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "ناتوانرێت permanently بسڕدرێتەوە — مێژوو/کۆگا هەیە.",
          },
          { status: 400 }
        );
      }
      await db.warehouse.delete({ where: { id } });
      await auditSafe({
        companyId: user.companyId,
        userId: user.id,
        module: "WAREHOUSE",
        action: "DELETE",
        entityType: "کۆگا",
        entityId: warehouse.id,
        summary: `کۆگا permanent delete: ${warehouse.name}`,
        oldValue: { name: warehouse.name, code: warehouse.code },
        metadata: { permanent: true },
        req,
      });
      return NextResponse.json({
        success: true,
        message: "کۆگا بە هەمیشەیی سڕایەوە.",
        permanent: true,
      });
    }

    const totalWarehouses = await db.warehouse.count({
      where: {
        companyId: user.companyId,
        active: true,
      },
    });

    if (totalWarehouses === 1) {
      return NextResponse.json(
        {
          success: false,
          message: "ناتوانیت دوا کۆگا بسڕیتەوە.",
        },
        {
          status: 400,
        }
      );
    }

    if (warehouse.isMain) {
      return NextResponse.json(
        {
          success: false,
          message: "ناتوانیت کۆگای سەرەکی بسڕیتەوە.",
        },
        {
          status: 400,
        }
      );
    }

    await db.warehouse.update({
      where: {
        id,
      },
      data: {
        active: false,
      },
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "WAREHOUSE",
      action: "DELETE",
      entityType: "کۆگا",
      entityId: warehouse.id,
      summary: `کۆگای ${warehouse.name} سڕایەوە (soft)`,
      oldValue: { name: warehouse.name, code: warehouse.code },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "کۆگا سڕایەوە — Undo بەردەستە.",
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