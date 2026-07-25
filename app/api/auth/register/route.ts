import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { db } from "@/lib/prisma/db";

import { hashPassword } from "@/lib/auth/hash";

import { sendVerificationEmail } from "@/lib/email/sendVerificationEmail";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { apiRateLimited } from "@/lib/api/response";

const registerSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "ناوی کۆمپانیا زۆر کورتە.")
    .max(100),

  fullName: z
    .string()
    .trim()
    .min(3, "ناوی تەواو زۆر کورتە.")
    .max(100),

  username: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "ناوی بەکارهێنەر تەنها دەبێت پیت، ژمارە و (_) بێت."
    ),

  email: z
    .string()
    .trim()
    .email("ئیمەیڵ دروست نییە."),

  password: z
    .string()
    .min(8, "وشەی نهێنی دەبێت لانیکەم ٨ پیت بێت.")
    .regex(/[A-Z]/, "دەبێت پیتێکی گەورەی تێدابێت.")
    .regex(/[a-z]/, "دەبێت پیتێکی بچووک تێدابێت.")
    .regex(/[0-9]/, "دەبێت ژمارەی تێدابێت.")
    .regex(
      /[^A-Za-z0-9]/,
      "دەبێت هێمای تایبەت (@#$...) تێدابێت."
    ),
});

function generateOtp() {
  return Math.floor(
    100000 + Math.random() * 900000
  ).toString();
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(clientKey(req, "register"), {
      limit: 5,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return apiRateLimited(limited);
    }

    const body = await req.json();

    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error.issues[0].message,
        },
        {
          status: 400,
        }
      );
    }

    const {
      companyName,
      fullName,
      username,
      email,
      password,
    } = result.data;
    const existingEmail = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (existingEmail) {
      return NextResponse.json(
        {
          success: false,
          message: "ئەم ئیمەیڵە پێشتر بەکارهاتووە.",
        },
        {
          status: 409,
        }
      );
    }

    const existingUsername = await db.user.findUnique({
      where: {
        username,
      },
    });

    if (existingUsername) {
      return NextResponse.json(
        {
          success: false,
          message: "ئەم ناوی بەکارهێنەرە پێشتر بەکارهاتووە.",
        },
        {
          status: 409,
        }
      );
    }

    const hashedPassword =
      await hashPassword(password);

    const otp = generateOtp();

    const otpExpiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    const data = await db.$transaction(
      async (tx) => {
        const company =
          await tx.company.create({
            data: {
              name: companyName,
              email,
            },
          });

     const user = await tx.user.create({
  data: {
    companyId: company.id,
    fullName,
    username,
    email,
    password: hashedPassword,

    verified: false,
    otp,
    otpExpiresAt,
  },
});

        const settings =
          await tx.settings.create({
            data: {
              companyId: company.id,
            },
          });

        return {
          company,
          user,
          settings,
        };
      }
    );
    await sendVerificationEmail(
      email,
      fullName,
      otp
    );

    return NextResponse.json(
      {
        success: true,

        message:
          "هەژمارەکەت دروستکرا. کۆدی پشتڕاستکردنەوە بۆ ئیمەیڵەکەت نێردرا.",

        data: {
          id: data.user.id,
          email: data.user.email,
          verified: data.user.verified,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("REGISTER ERROR:");
console.error(error);

if (error instanceof Error) {
  console.error(error.message);
  console.error(error.stack);
}

    return NextResponse.json(
      {
        success: false,
        message: "هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵ بدە.",
      },
      {
        status: 500,
      }
    );
  }
}