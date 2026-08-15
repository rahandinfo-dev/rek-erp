import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(
      50,
      Math.max(1, Number(searchParams.get("pageSize") || 10))
    );
    const activeParam = searchParams.get("active");

    const where = {
      companyId: user.companyId,
      deletedAt: null,
      ...(activeParam === "false"
        ? { active: false }
        : { active: true }),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { symbol: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, units] = await Promise.all([
      db.unit.count({ where }),
      db.unit.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: units,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const symbol = String(body.symbol || "").trim();
    const active = body.active !== false;

    if (!name || !symbol) {
      return NextResponse.json(
        { success: false, message: "ناوی یەکە و کورتکراوەکەی پێویستن." },
        { status: 400 }
      );
    }

    const existingName = await db.unit.findFirst({
      where: { companyId: user.companyId, name },
    });

    if (existingName) {
      return NextResponse.json(
        { success: false, message: "ئەم ناوی یەکەیە پێشتر تۆمار کراوە." },
        { status: 400 }
      );
    }

    const existingSymbol = await db.unit.findFirst({
      where: { companyId: user.companyId, symbol },
    });

    if (existingSymbol) {
      return NextResponse.json(
        { success: false, message: "ئەم کورتکراوەیە پێشتر تۆمار کراوە." },
        { status: 400 }
      );
    }

    const unit = await db.unit.create({
      data: {
        companyId: user.companyId,
        name,
        symbol,
        active,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "یەکەکە بە سەرکەوتوویی زیادکرا.",
        data: unit,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
