-- Multi-tenant subscriptions and server-issued, hashed license codes.
CREATE TYPE "SubscriptionPlan" AS ENUM ('ONE_MONTH', 'THREE_MONTHS', 'ONE_YEAR', 'LIFETIME');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
CREATE TYPE "LicenseCodeStatus" AS ENUM ('UNUSED', 'USED', 'EXPIRED', 'REVOKED');

CREATE TABLE "CompanySubscription" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "licenseCodeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanySubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LicenseCode" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL,
  "companyId" TEXT,
  "status" "LicenseCodeStatus" NOT NULL DEFAULT 'UNUSED',
  "activatedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LicenseCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanySubscription_companyId_key" ON "CompanySubscription"("companyId");
CREATE UNIQUE INDEX "CompanySubscription_licenseCodeId_key" ON "CompanySubscription"("licenseCodeId");
CREATE INDEX "CompanySubscription_status_expiresAt_idx" ON "CompanySubscription"("status", "expiresAt");
CREATE UNIQUE INDEX "LicenseCode_codeHash_key" ON "LicenseCode"("codeHash");
CREATE INDEX "LicenseCode_status_plan_createdAt_idx" ON "LicenseCode"("status", "plan", "createdAt");
CREATE INDEX "LicenseCode_companyId_status_idx" ON "LicenseCode"("companyId", "status");
CREATE INDEX "LicenseCode_expiresAt_idx" ON "LicenseCode"("expiresAt");

ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_licenseCodeId_fkey" FOREIGN KEY ("licenseCodeId") REFERENCES "LicenseCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LicenseCode" ADD CONSTRAINT "LicenseCode_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LicenseCode" ADD CONSTRAINT "LicenseCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
