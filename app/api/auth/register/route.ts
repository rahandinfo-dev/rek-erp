import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { db } from "@/lib/prisma/db";

import { hashPassword } from "@/lib/auth/hash";

import { generateOtp, hashOtp } from "@/lib/auth/otp";

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
    const otpHash = hashOtp(otp);

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
    otp: otpHash,
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

    try {
      await sendVerificationEmail(email, fullName, otp);
    } catch (mailErr) {
      console.error("[register] verification email failed", mailErr);
      // Account exists; user can resend code. Do not fail registration.
    }

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
    // Surface Prisma's error code in the server log: a schema that has not
    // been migrated fails here with P2021 (missing table) or P2022 (missing
    // column), which is otherwise invisible behind the generic 500.
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : null;

    console.error("REGISTER ERROR", {
      code,
      message: error instanceof Error ? error.message : String(error),
      meta:
        error && typeof error === "object" && "meta" in error
          ? (error as { meta?: unknown }).meta
          : undefined,
    });

    if (code === "P2021" || code === "P2022") {
      console.error(
        "REGISTER ERROR: database schema is out of date — run `prisma migrate deploy`."
      );
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