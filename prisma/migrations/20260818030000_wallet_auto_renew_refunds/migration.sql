-- Additive wallet Phase 4 fields. No existing ERP or wallet data is altered.
ALTER TABLE "CompanySubscription"
  ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "autoRenewedForExpiry" TIMESTAMP(3);

ALTER TABLE "WalletPlanPurchase"
  ADD COLUMN IF NOT EXISTS "refundedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

ALTER TYPE "WalletEntryType" ADD VALUE IF NOT EXISTS 'BONUS';

DO $$ BEGIN
  CREATE TYPE "WalletAutoRenewStatus" AS ENUM ('RENEWED', 'INSUFFICIENT_BALANCE', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WalletAutoRenewAttempt" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "renewalExpiry" TIMESTAMP(3) NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "status" "WalletAutoRenewStatus" NOT NULL,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WalletAutoRenewAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WalletAutoRenewAttempt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "WalletAutoRenewAttempt_companyId_renewalExpiry_key" ON "WalletAutoRenewAttempt"("companyId", "renewalExpiry");
CREATE INDEX IF NOT EXISTS "WalletAutoRenewAttempt_status_createdAt_idx" ON "WalletAutoRenewAttempt"("status", "createdAt");
