import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { db } from "@/lib/prisma/db";
import type { SubscriptionPlan } from "@/lib/prisma/client";
import { SUBSCRIPTION_PLAN_DURATIONS } from "@/lib/subscriptions/pricing";
import {
  PROTECTED_SUBSCRIPTION_API_PREFIXES,
  PROTECTED_SUBSCRIPTION_PATHS,
} from "@/lib/subscriptions/paths";

export const SUBSCRIPTION_LOCK_MESSAGE =
  "بۆ بەکارهێنانی ئەم بەشە پێویستە بەشداربوونت چالاک بێت.";

export { PROTECTED_SUBSCRIPTION_API_PREFIXES, PROTECTED_SUBSCRIPTION_PATHS };

export type SubscriptionEntitlement = {
  active: boolean;
  status: "NONE" | "ACTIVE" | "EXPIRED" | "REVOKED" | "CANCELLED" | "SUSPENDED";
  plan: SubscriptionPlan | null;
  activatedAt: Date | null;
  expiresAt: Date | null;
  remainingDays: number | null;
  remainingSeconds: number | null;
  serverNow: Date;
  expiresSoon: boolean;
};

export class LicenseActivationError extends Error {
  constructor(
    public readonly code:
      | "INVALID"
      | "USED_BY_ANOTHER_COMPANY"
      | "UNAVAILABLE"
      | "ALREADY_LIFETIME"
      | "CONCURRENT_USE",
  ) {
    super(code);
  }
}

function licensePepper() {
  const pepper = process.env.LICENSE_CODE_PEPPER;
  if (pepper && pepper.length >= 16) return pepper;
  if (process.env.NODE_ENV !== "production") return "rek-development-license-pepper-only";
  throw new Error("LICENSE_CODE_PEPPER must be set (min 16 chars) in production.");
}

export function normalizeActivationCode(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function hashLicenseCode(value: string) {
  return createHmac("sha256", licensePepper())
    .update(normalizeActivationCode(value))
    .digest("hex");
}

/** 160 bits of CSPRNG entropy; groups are only for human entry, not predictability. */
export function createPlaintextLicenseCode() {
  const raw = randomBytes(20).toString("hex").toUpperCase();
  return raw.match(/.{1,5}/g)!.join("-");
}

export function planExpiry(plan: SubscriptionPlan, from: Date) {
  if (plan === "LIFETIME") return null;
  const totalDays = SUBSCRIPTION_PLAN_DURATIONS[plan].totalDays;
  if (!totalDays) return null;
  return new Date(from.getTime() + totalDays * 86_400_000);
}

export function subscriptionEntitlementFromRecord(
  subscription: {
    status: "ACTIVE" | "EXPIRED" | "REVOKED" | "CANCELLED" | "SUSPENDED";
    plan: SubscriptionPlan;
    activatedAt: Date;
    expiresAt: Date | null;
  } | null,
  now = new Date(),
): SubscriptionEntitlement {
  if (!subscription) {
    return { active: false, status: "NONE", plan: null, activatedAt: null, expiresAt: null, remainingDays: null, remainingSeconds: null, serverNow: now, expiresSoon: false };
  }
  const expired = subscription.status === "ACTIVE" && subscription.expiresAt !== null && subscription.expiresAt <= now;
  const status = expired ? "EXPIRED" : subscription.status;
  if (status !== "ACTIVE") {
    return { active: false, status, plan: null, activatedAt: null, expiresAt: null, remainingDays: 0, remainingSeconds: 0, serverNow: now, expiresSoon: false };
  }
  const remainingDays = subscription.expiresAt
    ? Math.max(0, Math.ceil((subscription.expiresAt.getTime() - now.getTime()) / 86_400_000))
    : null;
  const remainingSeconds = subscription.expiresAt
    ? Math.max(0, Math.floor((subscription.expiresAt.getTime() - now.getTime()) / 1_000))
    : null;
  return {
    active: status === "ACTIVE",
    status,
    plan: subscription.plan,
    activatedAt: subscription.activatedAt,
    expiresAt: subscription.expiresAt,
    remainingDays,
    remainingSeconds,
    serverNow: now,
    expiresSoon: status === "ACTIVE" && remainingDays !== null && remainingDays <= 5,
  };
}

/** This is the one reusable database entitlement evaluation for pages, APIs, and Proxy. */
export async function getSubscriptionEntitlement(companyId: string): Promise<SubscriptionEntitlement> {
  const now = new Date();
  return db.$transaction(async (tx) => {
    const subscription = await tx.companySubscription.findUnique({ where: { companyId } });
    const entitlement = subscriptionEntitlementFromRecord(subscription, now);
    if (!subscription) return entitlement;

    if (entitlement.status === "EXPIRED" && subscription.status === "ACTIVE") {
      const expired = await tx.companySubscription.updateMany({
        where: { id: subscription.id, status: "ACTIVE", expiresAt: { lte: now } },
        data: { status: "EXPIRED" },
      });
      if (expired.count === 1) {
        await tx.subscriptionLifecycleEvent.create({ data: {
          companyId, subscriptionId: subscription.id, type: "EXPIRED", actionSource: "SYSTEM", previousPlan: subscription.plan, previousStatus: "ACTIVE",
          plan: subscription.plan, status: "EXPIRED", activatedAt: subscription.activatedAt, expiresAt: subscription.expiresAt, finalizedAt: now,
          durationDays: SUBSCRIPTION_PLAN_DURATIONS[subscription.plan].totalDays, bonusDays: SUBSCRIPTION_PLAN_DURATIONS[subscription.plan].bonusDays,
        } });
      }
    }

    if (entitlement.active && entitlement.expiresSoon && subscription.expiresAt) {
      const bucket = `${subscription.id}:${now.toISOString().slice(0, 10)}`;
      await tx.subscriptionWarningState.createMany({ data: [{ companyId }], skipDuplicates: true });
      const claimWarning = await tx.subscriptionWarningState.updateMany({
        where: { companyId, NOT: { warningBucket: bucket } },
        data: { subscriptionId: subscription.id, warningBucket: bucket, lastNotifiedAt: now },
      });
      if (claimWarning.count === 1) {
        await tx.notification.create({ data: {
          companyId, title: "ئاگاداری بەشداربوون", message: `ماوەی بەشداربوونت: ${entitlement.remainingDays} ڕۆژ. تکایە نوێی بکەرەوە.`,
          category: "WARNING", priority: "HIGH", href: "/dashboard/payment-online", entityType: "SubscriptionExpiryWarning", entityId: subscription.id,
          metadata: { warningBucket: bucket, expiresAt: subscription.expiresAt.toISOString(), remainingSeconds: entitlement.remainingSeconds },
        } });
      }
    }
    return entitlement;
  });
}

/** Immutable tenant-visible purchase and lifecycle ledger; plaintext codes are never returned. */
export async function getCompanySubscriptionHistory(companyId: string) {
  return db.subscriptionLifecycleEvent.findMany({
    where: { companyId }, orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, type: true, actionSource: true, plan: true, status: true, activatedAt: true, expiresAt: true, finalizedAt: true, createdAt: true, durationDays: true, bonusDays: true, codeFingerprint: true, licenseCode: { select: { codeHash: true } } },
  });
}

export async function activateLicenseCode(input: { code: string; companyId: string; activatedByUserId?: string | null; activatedByName?: string | null; actionSource?: "CUSTOMER" | "ADMIN" | "SYSTEM" }) {
  const codeHash = hashLicenseCode(input.code);
  const now = new Date();
  const result = await db.$transaction(async (tx) => {
    const license = await tx.licenseCode.findUnique({ where: { codeHash } });
    if (!license) throw new LicenseActivationError("INVALID");
    if (license.status === "USED") {
      if (license.companyId !== input.companyId) throw new LicenseActivationError("USED_BY_ANOTHER_COMPANY");
      const existing = await tx.companySubscription.findUnique({ where: { companyId: input.companyId } });
      return { idempotent: true, entitlement: subscriptionEntitlementFromRecord(existing, now) };
    }
    if (license.status !== "UNUSED" || (license.expiresAt && license.expiresAt <= now)) {
      throw new LicenseActivationError("UNAVAILABLE");
    }

    const current = await tx.companySubscription.findUnique({ where: { companyId: input.companyId } });
    if (current?.status === "ACTIVE" && current.expiresAt === null) {
      throw new LicenseActivationError("ALREADY_LIFETIME");
    }
    const claim = await tx.licenseCode.updateMany({
      where: { id: license.id, status: "UNUSED", companyId: null },
      data: { companyId: input.companyId, usedByUserId: input.activatedByUserId || null, status: "USED", activatedAt: now, usedAt: now },
    });
    if (claim.count !== 1) throw new LicenseActivationError("CONCURRENT_USE");

    const anchor = current?.status === "ACTIVE" && current.expiresAt && current.expiresAt > now
      ? current.expiresAt
      : now;
    const expiresAt = planExpiry(license.plan, anchor);
    const subscription = await tx.companySubscription.upsert({
      where: { companyId: input.companyId },
      create: { companyId: input.companyId, plan: license.plan, status: "ACTIVE", activatedAt: now, expiresAt, licenseCodeId: license.id },
      update: { plan: license.plan, status: "ACTIVE", activatedAt: now, expiresAt, licenseCodeId: license.id, cancelledAt: null, cancelledByUserId: null, cancelledFromPlan: null, cancelledFromStatus: null },
    });
    await tx.licenseCode.update({ where: { id: license.id }, data: { expiresAt } });
    const codeFingerprint = codeHash.slice(0, 16);
    await tx.subscriptionLifecycleEvent.create({ data: {
      companyId: input.companyId, userId: input.activatedByUserId || null, licenseCodeId: license.id,
      subscriptionId: subscription.id, type: current ? "RENEWED" : "ACTIVATED", actionSource: input.actionSource || (input.activatedByUserId ? "CUSTOMER" : "ADMIN"), previousPlan: current?.plan, previousStatus: current?.status,
      plan: license.plan, status: "ACTIVE", activatedAt: now, expiresAt, durationDays: SUBSCRIPTION_PLAN_DURATIONS[license.plan].totalDays, bonusDays: SUBSCRIPTION_PLAN_DURATIONS[license.plan].bonusDays, codeFingerprint,
    } });
    const admins = await tx.superAdmin.findMany({ where: { active: true }, select: { id: true, email: true } });
    if (admins.length) await tx.superAdminNotification.createMany({ data: admins.map((admin) => ({
      superAdminId: admin.id, kind: "LICENSE_CODE_CONSUMED", title: "License code consumed",
      message: `License ${codeFingerprint} was consumed for ${license.plan}.`,
      metadata: { licenseCodeId: license.id, codeFingerprint, plan: license.plan, companyId: input.companyId, userId: input.activatedByUserId || null, userName: input.activatedByName || null, usedAt: now.toISOString(), expiresAt: expiresAt?.toISOString() || null },
    })) });
    return { idempotent: false, entitlement: subscriptionEntitlementFromRecord(subscription, now), adminEmails: admins.map((admin) => admin.email), codeFingerprint, plan: license.plan, expiresAt };
  });
  if (!result.idempotent) {
    const consumed = result as typeof result & { adminEmails: string[]; codeFingerprint: string; plan: SubscriptionPlan; expiresAt: Date | null };
    if (consumed.adminEmails.length) void sendLicenseConsumedEmail({ emails: consumed.adminEmails, codeFingerprint: consumed.codeFingerprint, plan: consumed.plan, companyId: input.companyId, userName: input.activatedByName || null, usedAt: now, expiresAt: consumed.expiresAt });
  }
  return result;
}

async function sendLicenseConsumedEmail(input: { emails: string[]; codeFingerprint: string; plan: SubscriptionPlan; companyId: string; userName: string | null; usedAt: Date; expiresAt: Date | null }) {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_FROM) return;
  try {
    const { sendEmail } = await import("@/lib/email/sendEmail");
    await Promise.allSettled(input.emails.map((email) => sendEmail(email, "REK ERP license code consumed", `<p>A license code was consumed.</p><ul><li>Code fingerprint: ${input.codeFingerprint}</li><li>Plan: ${input.plan}</li><li>Company: ${input.companyId}</li><li>User: ${input.userName || "System"}</li><li>Used at: ${input.usedAt.toISOString()}</li><li>Expires: ${input.expiresAt?.toISOString() || "Lifetime"}</li></ul>`)));
  } catch (error) {
    console.error("SUBSCRIPTION_ADMIN_ALERT_EMAIL_ERROR", error);
  }
}

export async function generateLicenseCodes(input: { plan: SubscriptionPlan; count: number; createdBySuperAdminId: string }) {
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 500) {
    throw new Error("INVALID_COUNT");
  }
  const rows = Array.from({ length: input.count }, () => {
    const code = createPlaintextLicenseCode();
    return { code, codeHash: hashLicenseCode(code) };
  });
  if (new Set(rows.map((row) => row.codeHash)).size !== rows.length) throw new Error("CODE_COLLISION");
  await db.licenseCode.createMany({
    data: rows.map((row) => ({ codeHash: row.codeHash, plan: input.plan, createdBySuperAdminId: input.createdBySuperAdminId })),
  });
  return rows.map((row) => row.code);
}

export async function revokeLicenseCode(id: string) {
  return db.$transaction(async (tx) => {
    const license = await tx.licenseCode.findUnique({ where: { id } });
    if (!license) return null;
    await tx.licenseCode.update({ where: { id }, data: { status: "REVOKED" } });
    const subscription = license.companyId
      ? await tx.companySubscription.updateMany({
          where: { companyId: license.companyId, licenseCodeId: id },
          data: { status: "REVOKED" },
        })
      : { count: 0 };
    if (license.companyId && subscription.count === 1) {
      const current = await tx.companySubscription.findUnique({ where: { companyId: license.companyId } });
      if (current) await tx.subscriptionLifecycleEvent.create({ data: {
        companyId: license.companyId, licenseCodeId: id, subscriptionId: current.id, type: "REVOKED", actionSource: "ADMIN",
        previousPlan: current.plan, previousStatus: "ACTIVE", plan: current.plan, status: "REVOKED", activatedAt: current.activatedAt, expiresAt: current.expiresAt, finalizedAt: new Date(),
        durationDays: SUBSCRIPTION_PLAN_DURATIONS[current.plan].totalDays, bonusDays: SUBSCRIPTION_PLAN_DURATIONS[current.plan].bonusDays, reason: "LICENSE_REVOKED",
      } });
    }
    return { license, revokedCurrentSubscription: subscription.count === 1 };
  });
}

/** Hard deletion is deliberately limited to untouched codes with no historical references. */
export async function deleteLicenseCodeSafely(id: string) {
  return db.$transaction(async (tx) => {
    const license = await tx.licenseCode.findUnique({ where: { id }, select: { id: true, codeHash: true, plan: true, status: true, companyId: true } });
    if (!license) return { deleted: false as const, reason: "NOT_FOUND" as const };
    const [currentSubscriptionCount, lifecycleEventCount] = await Promise.all([
      tx.companySubscription.count({ where: { licenseCodeId: id } }),
      tx.subscriptionLifecycleEvent.count({ where: { licenseCodeId: id } }),
    ]);
    if (license.status !== "UNUSED" || license.companyId || currentSubscriptionCount || lifecycleEventCount) {
      return { deleted: false as const, reason: "REFERENCED" as const, license };
    }
    await tx.licenseCode.delete({ where: { id } });
    return { deleted: true as const, license };
  });
}

export async function extendCompanySubscription(input: { companyId: string; plan: SubscriptionPlan }) {
  const now = new Date();
  return db.$transaction(async (tx) => {
    const current = await tx.companySubscription.findUnique({ where: { companyId: input.companyId } });
    if (current?.status === "ACTIVE" && current.expiresAt === null) return current;
    const anchor = current?.status === "ACTIVE" && current.expiresAt && current.expiresAt > now ? current.expiresAt : now;
    const subscription = await tx.companySubscription.upsert({
      where: { companyId: input.companyId },
      create: { companyId: input.companyId, plan: input.plan, status: "ACTIVE", activatedAt: now, expiresAt: planExpiry(input.plan, anchor) },
      update: { plan: input.plan, status: "ACTIVE", activatedAt: now, expiresAt: planExpiry(input.plan, anchor), cancelledAt: null, cancelledByUserId: null, cancelledFromPlan: null, cancelledFromStatus: null },
    });
    await tx.subscriptionLifecycleEvent.create({ data: { companyId: input.companyId, type: current ? "RENEWED" : "ACTIVATED", previousPlan: current?.plan, previousStatus: current?.status, plan: input.plan, status: "ACTIVE", activatedAt: now, expiresAt: subscription.expiresAt } });
    return subscription;
  });
}

/** Customer cancellation immediately locks protected modules but never removes tenant data. */
export async function cancelCompanySubscription(input: { companyId: string; cancelledByUserId: string }) {
  const now = new Date();
  return db.$transaction(async (tx) => {
    const current = await tx.companySubscription.findUnique({ where: { companyId: input.companyId } });
    if (!current) return null;
    if (current.status !== "ACTIVE") return current;
    const subscription = await tx.companySubscription.update({ where: { companyId: input.companyId }, data: {
      status: "CANCELLED", cancelledAt: now, cancelledByUserId: input.cancelledByUserId,
      cancelledFromPlan: current.plan, cancelledFromStatus: current.status,
    } });
    await tx.subscriptionLifecycleEvent.create({ data: {
      companyId: input.companyId, userId: input.cancelledByUserId, licenseCodeId: current.licenseCodeId, subscriptionId: current.id,
      type: "CANCELLED", actionSource: "CUSTOMER", previousPlan: current.plan, previousStatus: current.status,
      plan: current.plan, status: "CANCELLED", activatedAt: current.activatedAt, expiresAt: current.expiresAt, finalizedAt: now,
      durationDays: SUBSCRIPTION_PLAN_DURATIONS[current.plan].totalDays, bonusDays: SUBSCRIPTION_PLAN_DURATIONS[current.plan].bonusDays, reason: "CUSTOMER_CANCELLED", metadata: { cancellationTakesEffect: "immediately" },
    } });
    return subscription;
  });
}

/** Admin suspension is access-destructive only; the subscription and ERP history remain intact. */
export async function suspendCompanySubscription(input: { companyId: string; reason?: string | null }) {
  const now = new Date();
  return db.$transaction(async (tx) => {
    const current = await tx.companySubscription.findUnique({ where: { companyId: input.companyId } });
    if (!current) return null;
    if (current.status !== "ACTIVE") return current;
    const subscription = await tx.companySubscription.update({ where: { companyId: input.companyId }, data: { status: "SUSPENDED" } });
    await tx.subscriptionLifecycleEvent.create({ data: {
      companyId: input.companyId, licenseCodeId: current.licenseCodeId, subscriptionId: current.id, type: "REVOKED", actionSource: "ADMIN",
      previousPlan: current.plan, previousStatus: current.status, plan: current.plan, status: "SUSPENDED", activatedAt: current.activatedAt, expiresAt: current.expiresAt,
      finalizedAt: now, durationDays: SUBSCRIPTION_PLAN_DURATIONS[current.plan].totalDays, bonusDays: SUBSCRIPTION_PLAN_DURATIONS[current.plan].bonusDays, reason: input.reason || "ADMIN_SUSPENDED",
    } });
    return subscription;
  });
}
