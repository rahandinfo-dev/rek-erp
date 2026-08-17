import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const service = read("lib/subscriptions/service.ts");
const proxy = read("proxy.ts");
const activationApi = read("app/api/subscription/activate/route.ts");
const adminApi = read("app/api/admin/subscriptions/route.ts");
const adminAuth = read("lib/super-admin/auth.ts");
const schema = read("prisma/schema.prisma");

test("no-subscription tenants are locked and valid subscriptions are active", () => {
  assert.match(service, /status: "NONE"/);
  assert.match(service, /active: status === "ACTIVE"/);
});

test("activation is transactional, code-bound, and idempotent for its company", () => {
  assert.match(service, /db\.\$transaction/);
  assert.match(service, /license\.companyId !== input\.companyId/);
  assert.match(service, /idempotent: true/);
  assert.match(service, /companyId: input\.companyId/);
});

test("single-use and concurrent activations use an atomic UNUSED claim", () => {
  assert.match(service, /updateMany\(\{[\s\S]*status: "UNUSED"/);
  assert.match(service, /claim\.count !== 1/);
  assert.match(service, /CONCURRENT_USE/);
});

test("one, three, and twelve month plans plus lifetime have defined expiry semantics", () => {
  assert.match(service, /SUBSCRIPTION_PLAN_DURATIONS/);
  assert.match(read("lib\/subscriptions\/pricing.ts"), /ONE_MONTH: \{ baseDays: 30, bonusDays: 0, totalDays: 30/);
  assert.match(read("lib\/subscriptions\/pricing.ts"), /THREE_MONTHS: \{ baseDays: 90, bonusDays: 3, totalDays: 93/);
  assert.match(read("lib\/subscriptions\/pricing.ts"), /ONE_YEAR: \{ baseDays: 365, bonusDays: 7, totalDays: 372/);
  assert.match(service, /plan === "LIFETIME"\) return null/);
});

test("expired subscriptions auto-lock and the five-day warning is represented", () => {
  assert.match(service, /subscription\.expiresAt <= now/);
  assert.match(service, /data: \{ status: "EXPIRED" \}/);
  assert.match(service, /remainingDays <= 5/);
  assert.match(service, /subscriptionWarningState/);
  assert.match(service, /warningBucket/);
});

test("activation records one-time use, actor evidence, lifecycle history, and an admin alert", () => {
  assert.match(service, /usedByUserId/);
  assert.match(service, /type: current \? "RENEWED" : "ACTIVATED"/);
  assert.match(service, /superAdminNotification\.createMany/);
  assert.match(service, /LICENSE_CODE_CONSUMED/);
  assert.doesNotMatch(service, /plaintextCode/);
});

test("cancellation locks entitlement without deleting tenant data and remains auditable", () => {
  assert.match(service, /cancelCompanySubscription/);
  assert.match(service, /type: "CANCELLED"/);
  assert.match(service, /cancelledByUserId/);
  assert.match(read("app\/api\/subscription\/cancel\/route.ts"), /SUBSCRIPTION_CANCELLED/);
  assert.match(read("components\/subscriptions\/PaymentOnlineClient.tsx"), /cancelSubscription/);
});

test("current access state clears while immutable lifecycle history retains original plan evidence", () => {
  assert.match(service, /status !== "ACTIVE"/);
  assert.match(service, /plan: null, activatedAt: null, expiresAt: null, remainingDays: 0, remainingSeconds: 0/);
  assert.match(service, /getCompanySubscriptionHistory/);
  assert.match(schema, /model SubscriptionLifecycleEvent/);
  assert.match(schema, /CANCELLED/);
  assert.match(schema, /SUSPENDED/);
});

test("customer cancellation requires server-side exact confirmation and admin suspension is transactional", () => {
  const cancellationApi = read("app\/api\/subscription\/cancel\/route.ts");
  assert.match(cancellationApi, /CONFIRM/);
  assert.match(cancellationApi, /ڕازیم/);
  assert.match(cancellationApi, /CONFIRMATION_REQUIRED/);
  assert.match(service, /suspendCompanySubscription/);
  assert.match(read("app\/api\/admin\/subscriptions\/route.ts"), /action: z\.literal\("suspend"\)/);
});

test("customer cancellation also verifies the authenticated account password on the server", () => {
  const cancellationApi = read("app\/api\/subscription\/cancel\/route.ts");
  assert.match(cancellationApi, /comparePassword/);
  assert.match(cancellationApi, /db\.user\.findUnique/);
  assert.doesNotMatch(cancellationApi, /password: parsed\.data\.password/);
});

test("super admin sees every company history and can only hard-delete untouched codes", () => {
  assert.match(adminApi, /db\.company\.findMany/);
  assert.match(adminApi, /subscriptionLifecycleEvents/);
  assert.match(adminApi, /action: z\.literal\("delete"\)/);
  assert.match(service, /deleteLicenseCodeSafely/);
  assert.match(service, /lifecycleEventCount/);
  assert.match(read("components\/subscriptions\/SubscriptionAdminClient.tsx"), /مێژووی هەموو کۆمپانیاکان/);
});

test("admin code filters combine state, plan, code, company, and user searches without removing history", () => {
  assert.match(adminApi, /selectedPlan/);
  assert.match(adminApi, /usedByUser/);
  assert.match(adminApi, /codeCounts/);
  assert.match(read("components\/subscriptions\/SubscriptionAdminClient.tsx"), /filterPlan/);
  assert.match(read("components\/subscriptions\/SubscriptionAdminClient.tsx"), /AVAILABLE/);
});

test("activation attempts are rate-limited and audited without plaintext codes", () => {
  assert.match(activationApi, /limit: 8, windowMs: 15 \* 60_000/);
  assert.match(activationApi, /codeFingerprint/);
  assert.doesNotMatch(activationApi, /metadata: \{[^}]*code: parsed\.data\.code/);
});

test("Proxy rejects protected API writes and dashboard module gates stay server-side", () => {
  assert.match(proxy, /PROTECTED_SUBSCRIPTION_API_PREFIXES/);
  assert.match(proxy, /SUBSCRIPTION_REQUIRED/);
  assert.match(proxy, /getSubscriptionEntitlement\(payload\.companyId\)/);
  assert.match(read("components/subscriptions/SubscriptionModuleGate.tsx"), /getSubscriptionEntitlement/);
});

test("revocation is durable and affects the current linked subscription", () => {
  assert.match(service, /data: \{ status: "REVOKED" \}/);
  assert.match(service, /licenseCodeId: id/);
});

test("the schema stores only hashed codes and tenant-bound subscription records", () => {
  assert.match(schema, /model LicenseCode/);
  assert.match(schema, /codeHash String @unique/);
  assert.match(schema, /model CompanySubscription/);
  assert.match(schema, /companyId String @unique/);
  assert.doesNotMatch(schema, /plaintextCode/);
});

test("super admins are separate from tenant users and all admin surfaces use their session", () => {
  assert.match(schema, /model SuperAdmin/);
  assert.match(schema, /model SuperAdminSession/);
  assert.match(proxy, /SUPER_ADMIN_UNAUTHORIZED/);
  assert.match(proxy, /SUPER_ADMIN_COOKIE/);
  assert.match(adminApi, /getCurrentSuperAdmin/);
  assert.doesNotMatch(adminApi, /getCurrentUser/);
});

test("super-admin password change, login throttling, and audit trail are enforced", () => {
  assert.match(adminAuth, /mustChangePassword/);
  assert.match(adminAuth, /isStrongSuperAdminPassword/);
  assert.match(read("app\/api\/admin\/auth\/login\/route.ts"), /limit: 5, windowMs: 15 \* 60_000/);
  assert.match(read("app\/api\/admin\/auth\/login\/route.ts"), /auditSuperAdmin/);
  assert.match(read("app\/api\/admin\/auth\/change-password\/route.ts"), /changeSuperAdminPassword/);
});
