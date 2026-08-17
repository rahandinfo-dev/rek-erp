-- Add subscription lifecycle evidence and notification de-duplication without
-- changing or removing any existing tenant/ERP records.
CREATE TYPE "SubscriptionLifecycleEventType" AS ENUM ('ACTIVATED', 'RENEWED', 'EXPIRED', 'CANCELLED', 'REVOKED');

ALTER TABLE "CompanySubscription"
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledByUserId" TEXT,
  ADD COLUMN "cancelledFromPlan" "SubscriptionPlan",
  ADD COLUMN "cancelledFromStatus" "SubscriptionStatus";

ALTER TABLE "LicenseCode" ADD COLUMN "usedByUserId" TEXT;

CREATE TABLE "SubscriptionWarningState" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "warningBucket" TEXT,
  "lastNotifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionWarningState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionLifecycleEvent" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT,
  "licenseCodeId" TEXT,
  "type" "SubscriptionLifecycleEventType" NOT NULL,
  "previousPlan" "SubscriptionPlan",
  "previousStatus" "SubscriptionStatus",
  "plan" "SubscriptionPlan",
  "status" "SubscriptionStatus",
  "activatedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SuperAdminNotification" (
  "id" TEXT NOT NULL,
  "superAdminId" TEXT,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuperAdminNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionWarningState_companyId_key" ON "SubscriptionWarningState"("companyId");
CREATE INDEX "LicenseCode_usedByUserId_usedAt_idx" ON "LicenseCode"("usedByUserId", "usedAt");
CREATE INDEX "SubscriptionLifecycleEvent_companyId_createdAt_idx" ON "SubscriptionLifecycleEvent"("companyId", "createdAt");
CREATE INDEX "SubscriptionLifecycleEvent_licenseCodeId_createdAt_idx" ON "SubscriptionLifecycleEvent"("licenseCodeId", "createdAt");
CREATE INDEX "SuperAdminNotification_superAdminId_createdAt_idx" ON "SuperAdminNotification"("superAdminId", "createdAt");
CREATE INDEX "SuperAdminNotification_kind_createdAt_idx" ON "SuperAdminNotification"("kind", "createdAt");

ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LicenseCode" ADD CONSTRAINT "LicenseCode_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubscriptionWarningState" ADD CONSTRAINT "SubscriptionWarningState_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionLifecycleEvent" ADD CONSTRAINT "SubscriptionLifecycleEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionLifecycleEvent" ADD CONSTRAINT "SubscriptionLifecycleEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubscriptionLifecycleEvent" ADD CONSTRAINT "SubscriptionLifecycleEvent_licenseCodeId_fkey" FOREIGN KEY ("licenseCodeId") REFERENCES "LicenseCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SuperAdminNotification" ADD CONSTRAINT "SuperAdminNotification_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "SuperAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
