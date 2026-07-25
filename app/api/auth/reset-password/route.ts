import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/prisma/db";
import { hashPassword } from "@/lib/auth/hash";
import { validatePassword } from "@/lib/validators/password";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
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

    const { email, password } = result.data;

    const reset = await db.passwordReset.findUnique({
      where: {
        email,
      },
    });

    if (!reset) {
      return NextResponse.json(
        {
          success: false,
          message: "داواکاری گۆڕینی وشەی نهێنی نەدۆزرایەوە.",
        },
        {
          status: 404,
        }
      );
    }

    if (!reset.verified) {
      return NextResponse.json(
        {
          success: false,
          message: "سەرەتا دەبێت کۆدی OTP پشتڕاست بکەیت.",
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
          message: "کاتی کۆدی OTP تەواو بووە.",
        },
        {
          status: 400,
        }
      );
    }
const validation = validatePassword(password);

if (!validation.success) {
  return NextResponse.json(
    {
      success: false,
      message: validation.message,
    },
    {
      status: 400,
    }
  );
}
    const hashedPassword = await hashPassword(password);

    await db.user.update({
      where: {
        email,
      },
      data: {
        password: hashedPassword,
      },
    });

    await db.passwordReset.delete({
      where: {
        email,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "وشەی نهێنی بە سەرکەوتوویی گۆڕدرا.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("RESET PASSWORD ERROR:");
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