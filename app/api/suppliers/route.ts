import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { supplierSchema } from "@/lib/validators/supplier";
import { notifySafe } from "@/lib/notifications/create";

export async function GET() {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          message: "تکایە سەرەتا بچۆ ژوورەوە.",
        },
        { status: 401 }
      );
    }

    const suppliers = await db.supplier.findMany({
      where: {
        companyId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error("GET SUPPLIERS ERROR:", error);

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
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          message: "تکایە سەرەتا بچۆ ژوورەوە.",
        },
        { status: 401 }
      );
    }

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

    const { generatePartyCode } = await import("@/lib/numbering/engine");
    let code = (data.code || "").trim();
    if (!code) {
      code = (await generatePartyCode("suppliers", companyId)).value;
    } else {
      const exists = await db.supplier.findFirst({
        where: { companyId, code },
      });
      if (exists) {
        return NextResponse.json(
          {
            success: false,
            message: "ئەم کۆدە پێشتر بەکارهاتووە.",
          },
          { status: 400 }
        );
      }
    }

    const supplier = await db.supplier.create({
      data: {
        ...data,
        code,
        companyId,
      },
    });

    await notifySafe({
      companyId,
      title: "دابینکەر زیادکرا",
      message: `${supplier.name} (${supplier.code}) زیادکرا.`,
      category: "SUPPLIER",
      priority: "NORMAL",
      href: `/dashboard/suppliers/${supplier.id}/edit`,
      entityType: "Supplier",
      entityId: supplier.id,
    });

    return NextResponse.json({
      success: true,
      data: supplier,
      message: "دابینکەر بە سەرکەوتوویی زیادکرا.",
    });
  } catch (error) {
    console.error("CREATE SUPPLIER ERROR:", error);

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