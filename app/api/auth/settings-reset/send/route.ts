import { NextRequest } from "next/server";
import { db } from "@/lib/prisma/db";
import { generateOtp, hashOtp } from "@/lib/auth/otp";
import { sendForgotPasswordEmail } from "@/lib/email/sendForgotPasswordEmail";
import { getCurrentUser } from "@/lib/auth/current-user";
import { apiFail, apiOk, apiRateLimited } from "@/lib/api/response";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";

const SEND_OK =
  "کۆدی پشتڕاستکردنەوە بۆ ئیمەیڵی تۆمارکراوی هەژمارەکەت نێردرا.";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiFail("تکایە سەرەتا بچۆ ژوورەوە.", 401);
    }

    const limited = rateLimit(
      clientKey(req, `settings-reset-send:${user.id}`),
      { limit: 3, windowMs: 60_000 }
    );
    if (!limited.ok) return apiRateLimited(limited);

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10);
    const otpDigest = hashOtp(otp);

    await db.passwordReset.upsert({
      where: { email: user.email },
      update: { otp: otpDigest, expiresAt, verified: false },
      create: {
        email: user.email,
        otp: otpDigest,
        expiresAt,
        verified: false,
      },
    });

    try {
      await sendForgotPasswordEmail(user.email, user.fullName, otp);
    } catch (mailErr) {
      console.error("[settings-reset/send] email failed", mailErr);
      return apiFail("ناردنی ئیمەیڵ سەرکەوتوو نەبوو. دواتر هەوڵ بدەرەوە.", 503);
    }

    return apiOk(undefined, { message: SEND_OK });
  } catch (error) {
    console.error("[settings-reset/send]", error);
    return apiFail("هەڵەیەک ڕوویدا.", 500, { code: "INTERNAL" });
  }
}
