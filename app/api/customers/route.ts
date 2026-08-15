import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { customerSchema } from "@/lib/validators/customer";
import { notifySafe } from "@/lib/notifications/create";

export async function GET() {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const customers = await db.customer.findMany({
      where: { companyId, active: true, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        code: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        image: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = customerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    const { generatePartyCode } = await import("@/lib/numbering/engine");
    let code = (data.code || "").trim();
    if (!code) {
      code = (await generatePartyCode("customers", companyId)).value;
    } else {
      const exists = await db.customer.findFirst({
        where: { companyId, code },
      });
      if (exists) {
        return NextResponse.json(
          { success: false, message: "ئەم کۆدە پێشتر بەکارهاتووە." },
          { status: 400 }
        );
      }
    }

    const customer = await db.customer.create({
      data: {
        name: data.name,
        code,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
        image: data.image || null,
        active: data.active,
        companyId,
      },
    });

    await notifySafe({
      companyId,
      title: "کڕیار زیادکرا",
      message: `${customer.name} (${customer.code}) زیادکرا.`,
      category: "CUSTOMER",
      priority: "NORMAL",
      href: `/dashboard/customers/${customer.id}/edit`,
      entityType: "کڕیار",
      entityId: customer.id,
    });

    return NextResponse.json({
      success: true,
      data: customer,
      message: "کڕیار بە سەرکەوتوویی زیادکرا.",
    });
  } catch (error) {
    console.error("CREATE CUSTOMER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
