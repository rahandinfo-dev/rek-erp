import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { sendVerificationEmail } from "@/lib/email/sendVerificationEmail";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { apiRateLimited } from "@/lib/api/response";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(clientKey(req, "resend"), {
      limit: 5,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return apiRateLimited(limited);
    }

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, message: "ئیمەیڵ پێویستە." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // Generic response — avoid account enumeration
    if (!user || user.verified) {
      return NextResponse.json({
        success: true,
        message: "ئەگەر هەژمارێکی پشتڕاستنەکراو هەبێت، کۆد نێردرا.",
      });
    }

    const verificationCode = generateOtp();

    await db.user.update({
      where: { id: user.id },
      data: {
        otp: verificationCode,
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    try {
      await sendVerificationEmail(
        user.email,
        user.fullName,
        verificationCode
      );
    } catch (mailErr) {
      console.error("[resend-code] email failed", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: "ئەگەر هەژمارێکی پشتڕاستنەکراو هەبێت، کۆد نێردرا.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەکی ناوخۆ ڕوویدا." },
      { status: 500 }
    );
  }
}
