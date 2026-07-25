import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { notifySafe } from "@/lib/notifications/create";
import { auditSafe } from "@/lib/audit/log";

export async function GET() {
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

    const warehouses = await db.warehouse.findMany({
      where: {
        companyId: user.companyId,
        active: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: warehouses,
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

export async function POST(req: NextRequest) {
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

    const body = await req.json();

    const { name, address, isMain, capacity } = body;
    let code = typeof body.code === "string" ? body.code.trim() : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "تکایە ناوی کۆگا پڕبکەرەوە.",
        },
        {
          status: 400,
        }
      );
    }

    if (!code) {
      const { generatePartyCode } = await import("@/lib/numbering/engine");
      code = (await generatePartyCode("warehouses", user.companyId)).value;
    }

    const capacityValue =
      capacity === "" || capacity == null
        ? null
        : Number.isFinite(Number(capacity)) && Number(capacity) >= 0
          ? Number(capacity)
          : null;

    const exists = await db.warehouse.findFirst({
      where: {
        companyId: user.companyId,
        OR: [
          {
            name,
          },
          {
            code,
          },
        ],
      },
    });

    if (exists) {
      return NextResponse.json(
        {
          success: false,
          message: "ئەم کۆگا یان کۆدە پێشتر تۆمارکراوە.",
        },
        {
          status: 409,
        }
      );
    }
const totalWarehouses = await db.warehouse.count({
  where: {
    companyId: user.companyId,
    active: true,
  },
});

const makeMain =
  totalWarehouses === 0 ? true : isMain;

    if (makeMain) {
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

    const warehouse = await db.warehouse.create({
      data: {
        companyId: user.companyId,
        name,
        code,
        address,
        isMain: makeMain,
        capacity: capacityValue,
      },
    });

    await notifySafe({
      companyId: user.companyId,
      title: "کۆگا زیادکرا",
      message: `${warehouse.name} (${warehouse.code}) زیادکرا.`,
      category: "WAREHOUSE",
      priority: "NORMAL",
      href: `/dashboard/werehouse/${warehouse.id}`,
      entityType: "Warehouse",
      entityId: warehouse.id,
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "WAREHOUSE",
      action: "CREATE",
      entityType: "Warehouse",
      entityId: warehouse.id,
      summary: `کۆگای ${warehouse.name} دروستکرا`,
      newValue: { name: warehouse.name, code: warehouse.code },
      req,
    });

    return NextResponse.json(
      {
        success: true,
        message: "کۆگا بە سەرکەوتوویی زیادکرا.",
        data: warehouse,
      },
      {
        status: 201,
      }
    );
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