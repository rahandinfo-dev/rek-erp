import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/prisma/db";

const schema = z.object({
  email: z.string().email(),

  otp: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = schema.safeParse(body);

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

    const { email, otp } = result.data;

    const reset = await db.passwordReset.findUnique({
      where: {
        email,
      },
    });

    if (!reset) {
      return NextResponse.json(
        {
          success: false,
          message: "داواکاری نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    if (reset.otp !== otp) {
      return NextResponse.json(
        {
          success: false,
          message: "کۆدی OTP هەڵەیە.",
        },
        {
          status: 400,
        }
      );
    }

    if (reset.expiresAt < new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: "کۆدی OTP بەسەرچووە.",
        },
        {
          status: 400,
        }
      );
    }

    await db.passwordReset.update({
      where: {
        email,
      },
      data: {
        verified: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "OTP بە سەرکەوتوویی پشتڕاستکرایەوە.",
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