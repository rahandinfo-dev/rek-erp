import { redirect } from "next/navigation";
import { db } from "@/lib/prisma/db";
import { getCurrentSuperAdmin } from "@/lib/super-admin/auth";
import SubscriptionAdminClient from "@/components/subscriptions/SubscriptionAdminClient";
import SuperAdminLogoutButton from "@/components/super-admin/SuperAdminLogoutButton";

const companyHistorySelect = {
  id: true, name: true, code: true, email: true, createdAt: true,
  users: { select: { id: true, fullName: true, email: true }, orderBy: { createdAt: "asc" as const }, take: 1 },
  subscription: { select: { id: true, plan: true, status: true, activatedAt: true, expiresAt: true, cancelledAt: true } },
  _count: { select: { licenseCodes: true, subscriptionLifecycleEvents: true } },
  subscriptionLifecycleEvents: { select: { id: true, type: true, actionSource: true, plan: true, status: true, activatedAt: true, expiresAt: true, finalizedAt: true, durationDays: true, bonusDays: true, codeFingerprint: true, reason: true, createdAt: true }, orderBy: { createdAt: "desc" as const }, take: 100 },
};

export default async function SuperAdminPage() {
  const admin = await getCurrentSuperAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword) redirect("/admin/change-password");
  const [licenses, companies] = await Promise.all([
    db.licenseCode.findMany({ select: { id: true, plan: true, status: true, companyId: true, activatedAt: true, expiresAt: true, usedAt: true, createdAt: true, company: { select: { name: true, email: true } }, usedByUser: { select: { fullName: true, email: true } }, currentSubscription: { select: { id: true } }, _count: { select: { lifecycleEvents: true } } }, orderBy: { createdAt: "desc" }, take: 500 }),
    db.company.findMany({ select: companyHistorySelect, orderBy: { createdAt: "desc" }, take: 500 }),
  ]);
  return <main className="min-h-screen bg-background p-4 text-foreground sm:p-6 lg:p-8" dir="rtl"><div className="mx-auto max-w-7xl"><header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card px-5 py-4"><div><p className="text-xs font-black tracking-[.2em] text-primary">REK ERP · SUPER ADMIN</p><p dir="ltr" className="mt-1 text-sm text-muted-foreground">{admin.email}</p></div><SuperAdminLogoutButton /></header><SubscriptionAdminClient initialLicenses={licenses} initialCompanies={companies} /></div></main>;
}
