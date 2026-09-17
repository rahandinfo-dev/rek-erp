import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { auditSafe } from "@/lib/audit/log";
import {
  acceptCurrentOnboarding,
  CURRENT_ONBOARDING_VERSION,
} from "@/lib/onboarding/service";

const acceptanceSchema = z.object({
  accepted: z.literal(true),
  version: z.literal(CURRENT_ONBOARDING_VERSION),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = acceptanceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, code: "INVALID_ACCEPTANCE" }, { status: 400 });
  }

  const acceptance = await acceptCurrentOnboarding(user.id);
  await auditSafe({
    companyId: user.companyId,
    userId: user.id,
    userName: user.fullName,
    module: "AUTH",
    action: "OTHER",
    entityType: "UserOnboardingAcceptance",
    entityId: acceptance.id,
    summary: "REK ERP onboarding accepted",
    metadata: { version: acceptance.version, acceptedAt: acceptance.acceptedAt.toISOString() },
    req,
  });

  return NextResponse.json({
    success: true,
    data: { version: acceptance.version, acceptedAt: acceptance.acceptedAt },
  });
}
