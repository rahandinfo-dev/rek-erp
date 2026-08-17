import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { auditSafe } from "@/lib/audit/log";
import { apiRateLimited } from "@/lib/api/response";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { activateLicenseCode, hashLicenseCode, LicenseActivationError } from "@/lib/subscriptions/service";

const schema = z.object({ code: z.string().trim().min(12).max(128) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });
  const ipLimit = rateLimit(clientKey(req, "license-activation"), { limit: 8, windowMs: 15 * 60_000 });
  const companyLimit = rateLimit(`license-activation-company:${user.companyId}`, { limit: 8, windowMs: 15 * 60_000 });
  if (!ipLimit.ok) return apiRateLimited(ipLimit);
  if (!companyLimit.ok) return apiRateLimited(companyLimit);
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "کۆدی چالاکسازی دروست نییە." }, { status: 400 });

  const codeFingerprint = hashLicenseCode(parsed.data.code).slice(0, 16);
  try {
    const result = await activateLicenseCode({ code: parsed.data.code, companyId: user.companyId, activatedByUserId: user.id, activatedByName: user.fullName });
    await auditSafe({
      companyId: user.companyId, userId: user.id, userName: user.fullName,
      module: "SYSTEM", action: "OTHER", entityType: "Subscription", entityId: user.companyId,
      summary: result.idempotent ? "کۆدی چالاکسازی دووبارە پشتڕاستکرایەوە." : "بەشداربوون بە کۆدی چالاکسازی چالاککرا.",
      metadata: { event: "SUBSCRIPTION_ACTIVATED", idempotent: result.idempotent, codeFingerprint }, req,
    });
    return NextResponse.json({ success: true, data: result.entitlement, idempotent: result.idempotent });
  } catch (error) {
    const code = error instanceof LicenseActivationError ? error.code : "ACTIVATION_FAILED";
    await auditSafe({
      companyId: user.companyId, userId: user.id, userName: user.fullName,
      module: "SYSTEM", action: "OTHER", entityType: "Subscription", entityId: user.companyId,
      summary: "هەوڵی چالاکسازی سەرنەکەوت.", metadata: { event: "SUBSCRIPTION_ACTIVATION_FAILED", code, codeFingerprint }, status: "warning", req,
    });
    const messages: Record<string, string> = {
      INVALID: "کۆدی چالاکسازی دروست نییە.", USED_BY_ANOTHER_COMPANY: "ئەم کۆدە پێشتر بۆ کۆمپانیایەکی تر بەکارهاتووە.",
      UNAVAILABLE: "ئەم کۆدە بەردەست نییە یان بەسەرچووە.", ALREADY_LIFETIME: "بەشداربوونی هەمیشەیی پێشتر چالاکە.", CONCURRENT_USE: "کۆدە لەلایەن هەوڵێکی تر بەکارهێنرا، تکایە دۆخەکە نوێ بکەرەوە.",
    };
    return NextResponse.json({ success: false, message: messages[code] || "چالاکسازی سەرنەکەوت.", code }, { status: 409 });
  }
}
