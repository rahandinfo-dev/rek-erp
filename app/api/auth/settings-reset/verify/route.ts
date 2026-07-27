import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma/db";
import { verifyOtp } from "@/lib/auth/otp";
import { getCurrentUser } from "@/lib/auth/current-user";
import { apiFail, apiOk, apiRateLimited } from "@/lib/api/response";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  otp: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiFail("تکایە سەرەتا بچۆ ژوورەوە.", 401);
    }

    const limited = rateLimit(
      clientKey(req, `settings-reset-verify:${user.id}`),
      { limit: 8, windowMs: 60_000 }
    );
    if (!limited.ok) return apiRateLimited(limited);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiFail("کۆدی پشتڕاستکردنەوە نادروستە.", 400);
    }

    const reset = await db.passwordReset.findUnique({
      where: { email: user.email },
    });

    if (!reset) {
      return apiFail("سەرەتا داوای ناردنی کۆد بکە.", 404);
    }

    if (!verifyOtp(parsed.data.otp, reset.otp)) {
      return apiFail("کۆدی پشتڕاستکردنەوە هەڵەیە.", 400);
    }

    if (reset.expiresAt < new Date()) {
      return apiFail("کۆدی پشتڕاستکردنەوە بەسەرچووە.", 400);
    }

    await db.passwordReset.update({
      where: { email: user.email },
      data: { verified: true },
    });

    return apiOk(undefined, {
      message: "کۆدەکە پشتڕاستکرایەوە. ئێستا وشەی نهێنی نوێ دابنێ.",
    });
  } catch (error) {
    console.error("[settings-reset/verify]", error);
    return apiFail("هەڵەیەک ڕوویدا.", 500);
  }
}
