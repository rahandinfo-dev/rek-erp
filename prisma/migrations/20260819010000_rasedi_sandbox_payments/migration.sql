-- Additive provider-payment audit records. Existing wallet, subscription and ERP data is untouched.
CREATE TABLE "RasediPayment" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "gateway" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'RASEDI',
  "providerReference" TEXT,
  "providerStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "subscriptionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RasediPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RasediPayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RasediPayment_providerReference_key" ON "RasediPayment"("providerReference");
CREATE INDEX "RasediPayment_companyId_createdAt_idx" ON "RasediPayment"("companyId", "createdAt");
CREATE INDEX "RasediPayment_providerStatus_createdAt_idx" ON "RasediPayment"("providerStatus", "createdAt");
