import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma/db";
import type { Prisma } from "@/lib/prisma/client";
import { activateLicenseCode, deleteLicenseCodeSafely, extendCompanySubscription, generateLicenseCodes, hashLicenseCode, revokeLicenseCode, suspendCompanySubscription } from "@/lib/subscriptions/service";
import { auditSuperAdmin } from "@/lib/super-admin/audit";
import { getCurrentSuperAdmin } from "@/lib/super-admin/auth";

const plan = z.enum(["ONE_MONTH", "THREE_MONTHS", "ONE_YEAR", "LIFETIME"]);
const codeStatuses = new Set(["UNUSED", "USED", "EXPIRED", "REVOKED"]);
const subscriptionStatuses = new Set(["ACTIVE", "EXPIRED", "REVOKED", "CANCELLED", "SUSPENDED"]);
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate"), plan, count: z.number().int().min(1).max(500) }),
  z.object({ action: z.literal("revoke"), licenseId: z.string().min(1) }),
  z.object({ action: z.literal("delete"), licenseId: z.string().min(1) }),
  z.object({ action: z.literal("extend"), companyId: z.string().min(1), plan }),
  z.object({ action: z.literal("suspend"), companyId: z.string().min(1), reason: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal("activate"), companyId: z.string().min(12).max(128), code: z.string().min(12).max(128) }),
]);

async function requireAdmin() {
  const admin = await getCurrentSuperAdmin();
  return admin && !admin.mustChangePassword ? admin : null;
}

function companySearchWhere(query: string): Prisma.CompanyWhereInput {
  return { OR: [
    { id: { contains: query, mode: "insensitive" } }, { name: { contains: query, mode: "insensitive" } },
    { email: { contains: query, mode: "insensitive" } }, { code: { contains: query, mode: "insensitive" } },
    { users: { some: { OR: [{ fullName: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }, { username: { contains: query, mode: "insensitive" } }] } } },
  ] };
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ success: false, code: "FORBIDDEN" }, { status: 403 });
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const status = req.nextUrl.searchParams.get("status") || "ALL";
  const selectedPlan = req.nextUrl.searchParams.get("plan");
  const selectedPlanValue = selectedPlan && plan.safeParse(selectedPlan).success ? selectedPlan : null;
  const codeHash = q.length >= 12 ? hashLicenseCode(q) : null;
  const licenseWhere: Prisma.LicenseCodeWhereInput = {};
  if (codeStatuses.has(status)) licenseWhere.status = status as "UNUSED" | "USED" | "EXPIRED" | "REVOKED";
  if (selectedPlanValue) licenseWhere.plan = selectedPlanValue as "ONE_MONTH" | "THREE_MONTHS" | "ONE_YEAR" | "LIFETIME";
  if (q) licenseWhere.OR = [{ id: { contains: q, mode: "insensitive" } }, ...(codeHash ? [{ codeHash }] : []), { company: { is: companySearchWhere(q) } }, { usedByUser: { is: { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { username: { contains: q, mode: "insensitive" } }] } } }];
  const companyClauses: Prisma.CompanyWhereInput[] = [];
  if (q) companyClauses.push(companySearchWhere(q));
  if (selectedPlanValue) companyClauses.push({ OR: [{ subscription: { is: { plan: selectedPlanValue as "ONE_MONTH" | "THREE_MONTHS" | "ONE_YEAR" | "LIFETIME" } } }, { subscriptionLifecycleEvents: { some: { plan: selectedPlanValue as "ONE_MONTH" | "THREE_MONTHS" | "ONE_YEAR" | "LIFETIME" } } }] });
  if (subscriptionStatuses.has(status)) companyClauses.push({ OR: [{ subscription: { is: { status: status as "ACTIVE" | "EXPIRED" | "REVOKED" | "CANCELLED" | "SUSPENDED" } } }, { subscriptionLifecycleEvents: { some: { status: status as "ACTIVE" | "EXPIRED" | "REVOKED" | "CANCELLED" | "SUSPENDED" } } }] });
  const companyWhere: Prisma.CompanyWhereInput = companyClauses.length ? { AND: companyClauses } : {};
  const [licenses, companies, alerts, codeCounts, history] = await Promise.all([
    db.licenseCode.findMany({ where: licenseWhere, select: { id: true, plan: true, status: true, companyId: true, activatedAt: true, expiresAt: true, usedAt: true, createdAt: true, company: { select: { name: true, email: true } }, usedByUser: { select: { fullName: true, email: true } }, currentSubscription: { select: { id: true } }, _count: { select: { lifecycleEvents: true } } }, orderBy: { createdAt: "desc" }, take: 500 }),
    db.company.findMany({ where: companyWhere, orderBy: { createdAt: "desc" }, take: 500, select: { id: true, name: true, code: true, email: true, createdAt: true, users: { select: { id: true, fullName: true, email: true }, orderBy: { createdAt: "asc" }, take: 1 }, subscription: { select: { id: true, plan: true, status: true, activatedAt: true, expiresAt: true, cancelledAt: true } }, _count: { select: { licenseCodes: true, subscriptionLifecycleEvents: true } }, subscriptionLifecycleEvents: { select: { id: true, type: true, actionSource: true, plan: true, status: true, activatedAt: true, expiresAt: true, finalizedAt: true, durationDays: true, bonusDays: true, codeFingerprint: true, reason: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 } } }),
    db.superAdminNotification.findMany({ where: { superAdminId: user.id }, select: { id: true, kind: true, title: true, message: true, metadata: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.licenseCode.groupBy({ by: ["plan", "status"], _count: { _all: true } }),
    db.subscriptionLifecycleEvent.findMany({ where: { ...(selectedPlanValue ? { plan: selectedPlanValue as "ONE_MONTH" | "THREE_MONTHS" | "ONE_YEAR" | "LIFETIME" } : {}), ...(subscriptionStatuses.has(status) ? { status: status as "ACTIVE" | "EXPIRED" | "REVOKED" | "CANCELLED" | "SUSPENDED" } : {}), ...(q ? { company: { is: companySearchWhere(q) } } : {}) }, select: { id: true, type: true, actionSource: true, plan: true, status: true, activatedAt: true, expiresAt: true, finalizedAt: true, durationDays: true, bonusDays: true, codeFingerprint: true, reason: true, createdAt: true, company: { select: { name: true, email: true } }, user: { select: { fullName: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 500 }),
  ]);
  const subscriptions = companies.flatMap((company) => company.subscription ? [{ companyId: company.id, plan: company.subscription.plan, status: company.subscription.status, activatedAt: company.subscription.activatedAt, expiresAt: company.subscription.expiresAt, company: { name: company.name, email: company.email } }] : []);
  return NextResponse.json({ success: true, data: { licenses, companies, subscriptions, alerts, codeCounts, history } });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ success: false, code: "FORBIDDEN" }, { status: 403 });
  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "داواکاری بەڕێوەبردن دروست نییە." }, { status: 400 });
  const input = parsed.data;
  try {
    if (input.action === "generate") { const codes = await generateLicenseCodes({ plan: input.plan, count: input.count, createdBySuperAdminId: user.id }); await auditSuperAdmin({ superAdminId: user.id, action: "LICENSE_CODES_GENERATED", targetType: "LicenseCode", metadata: { plan: input.plan, count: input.count }, req }); return NextResponse.json({ success: true, data: { codes } }); }
    if (input.action === "delete") { const result = await deleteLicenseCodeSafely(input.licenseId); if (!result.deleted) return NextResponse.json({ success: false, code: result.reason, message: result.reason === "REFERENCED" ? "کۆدی بەکارهاتوو یان بە مێژوو پەیوەست ناتوانرێت بسڕدرێتەوە؛ وەستاندن بەکاربهێنە." : "کۆد نەدۆزرایەوە." }, { status: result.reason === "NOT_FOUND" ? 404 : 409 }); await auditSuperAdmin({ superAdminId: user.id, action: "LICENSE_CODE_DELETED", targetType: "LicenseCode", targetId: input.licenseId, metadata: { plan: result.license.plan, codeFingerprint: result.license.codeHash.slice(0, 16) }, req }); return NextResponse.json({ success: true }); }
    if (input.action === "revoke") { const result = await revokeLicenseCode(input.licenseId); if (!result) return NextResponse.json({ success: false, code: "NOT_FOUND" }, { status: 404 }); await auditSuperAdmin({ superAdminId: user.id, action: "LICENSE_REVOKED", targetType: "LicenseCode", targetId: input.licenseId, metadata: { revokedCurrentSubscription: result.revokedCurrentSubscription }, req }); return NextResponse.json({ success: true }); }
    if (input.action === "extend") { const subscription = await extendCompanySubscription(input); await auditSuperAdmin({ superAdminId: user.id, action: "SUBSCRIPTION_EXTENDED", targetType: "Subscription", targetId: input.companyId, metadata: { plan: input.plan }, req }); return NextResponse.json({ success: true, data: subscription }); }
    if (input.action === "suspend") { const subscription = await suspendCompanySubscription({ companyId: input.companyId, reason: input.reason }); if (!subscription) return NextResponse.json({ success: false, code: "NOT_FOUND" }, { status: 404 }); await auditSuperAdmin({ superAdminId: user.id, action: "SUBSCRIPTION_SUSPENDED", targetType: "Subscription", targetId: input.companyId, metadata: { reason: input.reason || null }, req }); return NextResponse.json({ success: true, data: subscription }); }
    const result = await activateLicenseCode({ companyId: input.companyId, code: input.code, actionSource: "ADMIN" });
    await auditSuperAdmin({ superAdminId: user.id, action: "SUBSCRIPTION_ACTIVATED", targetType: "Subscription", targetId: input.companyId, metadata: { idempotent: result.idempotent }, req });
    return NextResponse.json({ success: true, data: result.entitlement, idempotent: result.idempotent });
  } catch (error) { console.error("SUBSCRIPTION_ADMIN_ACTION_ERROR", error); return NextResponse.json({ success: false, message: "کردارەکە سەرنەکەوت." }, { status: 400 }); }
}
