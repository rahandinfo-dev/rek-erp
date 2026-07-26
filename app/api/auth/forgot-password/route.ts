import { NextRequest } from "next/server";
import { db } from "@/lib/prisma/db";
import { generateOtp, hashOtp } from "@/lib/auth/otp";
import { sendForgotPasswordEmail } from "@/lib/email/sendForgotPasswordEmail";
import { apiFail, apiOk, apiRateLimited } from "@/lib/api/response";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";

const GENERIC_OK =
  "ئەگەر ئیمەیڵەکە بوونی هەبێت، نامەی گۆڕینی وشەی نهێنی نێردرا.";

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(clientKey(req, "forgot"), {
      limit: 5,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return apiRateLimited(limited);
    }

    const body = await req.json();
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return apiFail("ئیمەیڵ پێویستە.", 400);
    }

    const user = await db.user.findUnique({ where: { email } });

    // Always return the same message — do not reveal account existence
    if (!user) {
      return apiOk(undefined, { message: GENERIC_OK });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10);
    const otpDigest = hashOtp(otp);

    await db.passwordReset.upsert({
      where: { email },
      update: { otp: otpDigest, expiresAt, verified: false },
      create: { email, otp: otpDigest, expiresAt, verified: false },
    });

    try {
      await sendForgotPasswordEmail(email, user.fullName, otp);
    } catch (mailErr) {
      console.error("[forgot-password] email failed", mailErr);
    }

    return apiOk(undefined, { message: GENERIC_OK });
  } catch (error) {
    console.error("[forgot-password]", error);
    return apiFail("هەڵەیەک ڕوویدا.", 500, { code: "INTERNAL" });
  }
}
