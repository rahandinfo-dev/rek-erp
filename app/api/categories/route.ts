import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
export async function GET() {
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

  const categories = await db.category.findMany({
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
    data: categories,
  });
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

    const exists = await db.category.findFirst({
      where: {
        companyId: user.companyId,
        name,
      },
    });

    if (exists) {
      return NextResponse.json(
        {
          success: false,
          message: "ئەم پۆلە پێشتر تۆمارکراوە.",
        },
        {
          status: 409,
        }
      );
    }

    const category = await db.category.create({
      data: {
        companyId: user.companyId,
        name,
        description,
        image: image || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "پۆل بە سەرکەوتوویی زیادکرا.",
        data: category,
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