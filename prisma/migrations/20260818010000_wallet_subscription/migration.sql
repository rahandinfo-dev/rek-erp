CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "WalletEntryType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "WalletEntryStatus" AS ENUM ('COMPLETED', 'VOID');
CREATE TYPE "WalletTopUpStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "WalletPurchaseStatus" AS ENUM ('COMPLETED', 'FAILED');

CREATE TABLE "Wallet" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'IQD',
  "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Wallet_companyId_key" ON "Wallet"("companyId");
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WalletLedgerEntry" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "type" "WalletEntryType" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL, "balanceBefore" DECIMAL(18,2) NOT NULL, "balanceAfter" DECIMAL(18,2) NOT NULL,
  "reason" TEXT NOT NULL, "referenceType" TEXT, "referenceId" TEXT, "paymentMethod" TEXT, "createdBy" TEXT,
  "status" "WalletEntryStatus" NOT NULL DEFAULT 'COMPLETED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletLedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WalletLedgerEntry_companyId_createdAt_idx" ON "WalletLedgerEntry"("companyId", "createdAt");
CREATE INDEX "WalletLedgerEntry_referenceType_referenceId_idx" ON "WalletLedgerEntry"("referenceType", "referenceId");
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WalletTopUp" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "amount" DECIMAL(18,2) NOT NULL, "paymentMethod" TEXT NOT NULL,
  "paymentReference" TEXT NOT NULL, "status" "WalletTopUpStatus" NOT NULL DEFAULT 'PENDING', "requestedBy" TEXT,
  "reviewedBy" TEXT, "reviewedAt" TIMESTAMP(3), "rejectionReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WalletTopUp_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WalletTopUp_paymentReference_key" ON "WalletTopUp"("paymentReference");
CREATE INDEX "WalletTopUp_companyId_status_createdAt_idx" ON "WalletTopUp"("companyId", "status", "createdAt");
ALTER TABLE "WalletTopUp" ADD CONSTRAINT "WalletTopUp_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WalletPlanPurchase" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "plan" "SubscriptionPlan" NOT NULL, "amount" DECIMAL(18,2) NOT NULL,
  "idempotencyKey" TEXT NOT NULL, "subscriptionId" TEXT, "ledgerEntryId" TEXT, "status" "WalletPurchaseStatus" NOT NULL DEFAULT 'COMPLETED', "createdBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletPlanPurchase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WalletPlanPurchase_companyId_idempotencyKey_key" ON "WalletPlanPurchase"("companyId", "idempotencyKey");
CREATE UNIQUE INDEX "WalletPlanPurchase_ledgerEntryId_key" ON "WalletPlanPurchase"("ledgerEntryId");
CREATE INDEX "WalletPlanPurchase_companyId_createdAt_idx" ON "WalletPlanPurchase"("companyId", "createdAt");
ALTER TABLE "WalletPlanPurchase" ADD CONSTRAINT "WalletPlanPurchase_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
