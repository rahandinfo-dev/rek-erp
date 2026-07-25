import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/prisma/db";
import { generateToken } from "@/lib/auth/jwt";
import { auditSafe } from "@/lib/audit/log";
import { clientKey, rateLimit, RATE_PRESETS } from "@/lib/security/rate-limit";
import { apiFail, apiRateLimited } from "@/lib/api/response";

const INVALID_CREDENTIALS = "ئیمەیڵ/ناوی بەکارهێنەر یان وشەی نهێنی هەڵەیە.";

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(clientKey(req, "login"), RATE_PRESETS.auth);
    if (!limited.ok) {
      return apiRateLimited(limited);
    }

    const body = await req.json();
    const { login, password } = body;

    if (!login || !password) {
      return apiFail("تکایە هەموو خانەکان پڕ بکەرەوە.", 400);
    }

    const user = await db.user.findFirst({
      where: {
        OR: [{ email: login }, { username: login }],
      },
    });

    // Always compare to reduce timing / enumeration signals
    const hash =
      user?.password ||
      "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    const passwordMatched = await bcrypt.compare(String(password), hash);

    if (!user || !passwordMatched) {
      if (user) {
        await auditSafe({
          companyId: user.companyId,
          userId: user.id,
          userName: user.fullName,
          module: "AUTH",
          action: "LOGIN",
          summary: "هەوڵی چوونەژوورەوە سەرنەکەوت",
          newValue: { login, success: false, reason: "bad_credentials" },
          req,
          metadata: { success: false },
        });
      }
      return apiFail(INVALID_CREDENTIALS, 401, {
        code: "INVALID_CREDENTIALS",
      });
    }

    if (!user.verified) {
      return apiFail("هێشتا ئیمەیڵەکەت پشتڕاست نەکراوەتەوە.", 403, {
        code: "EMAIL_UNVERIFIED",
      });
    }

    const token = await generateToken({
      id: user.id,
      companyId: user.companyId,
      email: user.email,
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      userName: user.fullName,
      module: "AUTH",
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
      summary: `${user.fullName} چووە ژوورەوە`,
      newValue: { login, success: true },
      req,
    });

    const response = NextResponse.json({
      success: true,
      message: "بە سەرکەوتوویی چوویتە ژوورەوە.",
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error(error);
    return apiFail("هەڵەیەک ڕوویدا.", 500, { code: "INTERNAL" });
  }
}
