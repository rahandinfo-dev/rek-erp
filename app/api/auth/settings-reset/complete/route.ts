import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma/db";
import { hashPassword } from "@/lib/auth/hash";
import { validatePassword } from "@/lib/validators/password";
import { getCurrentUser } from "@/lib/auth/current-user";
import { notifySafe } from "@/lib/notifications/create";
import { apiFail, apiOk, apiRateLimited } from "@/lib/api/response";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiFail("تکایە سەرەتا بچۆ ژوورەوە.", 401);
    }

    const limited = rateLimit(
      clientKey(req, `settings-reset-complete:${user.id}`),
      { limit: 5, windowMs: 60_000 }
    );
    if (!limited.ok) return apiRateLimited(limited);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiFail("زانیاری نادروستە.", 400);
    }

    if (parsed.data.password !== parsed.data.confirmPassword) {
      return apiFail("وشەی نهێنی نوێ و دووپاتکردنەوە یەک ناگرنەوە.", 400);
    }

    const validation = validatePassword(parsed.data.password);
    if (!validation.success) {
      return apiFail(validation.message, 400);
    }

    const reset = await db.passwordReset.findUnique({
      where: { email: user.email },
    });

    if (!reset?.verified) {
      return apiFail("سەرەتا دەبێت کۆدی ئیمەیڵ پشتڕاست بکەیت.", 400);
    }

    if (reset.expiresAt < new Date()) {
      return apiFail("کاتی کۆدەکە تەواو بووە. دووبارە داوای کۆد بکە.", 400);
    }

    const hashedPassword = await hashPassword(parsed.data.password);

    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await db.passwordReset.delete({ where: { email: user.email } });

    await notifySafe({
      companyId: user.companyId,
      userId: user.id,
      title: "وشەی نهێنی گۆڕدرا",
      message: "وشەی نهێنی هەژمارەکەت بە ئیمەیڵ پشتڕاستکراو نوێکرایەوە.",
      category: "SYSTEM",
      priority: "HIGH",
      href: "/dashboard/settings",
      metadata: { kind: "SECURITY_ALERT" },
    });

    return apiOk(undefined, {
      message: "وشەی نهێنی بە سەرکەوتوویی گۆڕدرا.",
    });
  } catch (error) {
    console.error("[settings-reset/complete]", error);
    return apiFail("هەڵەیەک ڕوویدا.", 500);
  }
}
