import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { auditSafe } from "@/lib/audit/log";
import { comparePassword } from "@/lib/auth/hash";
import { db } from "@/lib/prisma/db";
import { cancelCompanySubscription } from "@/lib/subscriptions/service";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });
  const parsed = z.object({
    confirmation: z.string().trim().max(32).optional(),
    password: z.string().min(1).max(256).optional(),
  }).refine((input) => Boolean(input.confirmation || input.password)).safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, code: "CONFIRMATION_REQUIRED", message: "بۆ هەڵوەشاندنەوەی وشەی «CONFIRM» یان «ڕازیم» یان «وشەی نهێنی هەژماری کۆمپانیا» بنووسە" }, { status: 400 });
  }
  const confirmation = parsed.data.confirmation?.trim();
  const textConfirmed = confirmation?.toUpperCase() === "CONFIRM" || confirmation === "ڕازیم";
  let passwordConfirmed = false;
  if (!textConfirmed && parsed.data.password) {
    const account = await db.user.findUnique({ where: { id: user.id }, select: { password: true } });
    passwordConfirmed = Boolean(account && await comparePassword(parsed.data.password, account.password));
  }
  if (!textConfirmed && !passwordConfirmed) {
    return NextResponse.json({ success: false, code: "CONFIRMATION_REQUIRED", message: "دڵنیابوونەوە دروست نییە." }, { status: 400 });
  }
  const subscription = await cancelCompanySubscription({ companyId: user.companyId, cancelledByUserId: user.id });
  if (!subscription) return NextResponse.json({ success: false, code: "NOT_FOUND" }, { status: 404 });
  await auditSafe({
    companyId: user.companyId, userId: user.id, userName: user.fullName, module: "SYSTEM", action: "OTHER",
    entityType: "Subscription", entityId: user.companyId, summary: "بەشداربوون هەڵوەشێندرایەوە، داتای کۆمپانیا پارێزراوە.",
    metadata: { event: "SUBSCRIPTION_CANCELLED", previousPlan: subscription.cancelledFromPlan, previousStatus: subscription.cancelledFromStatus, cancelledAt: subscription.cancelledAt?.toISOString() }, req,
  });
  return NextResponse.json({ success: true, data: subscription });
}
