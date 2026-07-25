import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/prisma/db";

const verifySchema = z.object({
  email: z.string().email(),

  otp: z
    .string()
    .length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result =
      verifySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "زانیاری نادروستە.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      email,
      otp,
    } = result.data;
    const user = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "هەژمار نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    if (user.verified) {
      return NextResponse.json(
        {
          success: false,
          message: "ئەم هەژمارە پێشتر پشتڕاستکراوەتەوە.",
        },
        {
          status: 400,
        }
      );
    }

    if (!user.otp || !user.otpExpiresAt) {
      return NextResponse.json(
        {
          success: false,
          message: "کۆدی پشتڕاستکردنەوە بوونی نییە.",
        },
        {
          status: 400,
        }
      );
    }

    if (user.otp !== otp) {
      return NextResponse.json(
        {
          success: false,
          message: "کۆدی پشتڕاستکردنەوە هەڵەیە.",
        },
        {
          status: 400,
        }
      );
    }

    if (user.otpExpiresAt < new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: "کۆدی پشتڕاستکردنەوە بەسەرچووە.",
        },
        {
          status: 400,
        }
      );
    }
    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        verified: true,
        otp: null,
        otpExpiresAt: null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "ئیمەیڵەکەت بە سەرکەوتوویی پشتڕاستکرایەوە.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("VERIFY EMAIL ERROR:", error);

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