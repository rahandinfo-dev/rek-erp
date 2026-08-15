import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "دەستڕاگەیشتن ڕێگەپێنەدراوە.",
        },
        { status: 401 }
      );
    }

    const brands = await db.brand.findMany({
      where: {
        companyId: user.companyId,
        active: true,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: brands,
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
        { status: 401 }
      );
    }

    const body = await req.json();

    const { name } = body;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "تکایە ناوی براند بنووسە.",
        },
        { status: 400 }
      );
    }

    const exists = await db.brand.findFirst({
      where: {
        companyId: user.companyId,
        name,
      },
    });

    if (exists) {
      return NextResponse.json(
        {
          success: false,
          message: "ئەم براندە پێشتر تۆمارکراوە.",
        },
        { status: 409 }
      );
    }

    const brand = await db.brand.create({
      data: {
        companyId: user.companyId,
        name,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "براند بە سەرکەوتوویی زیادکرا.",
        data: brand,
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
