-- Finalize lifecycle statuses and enrich the immutable event ledger. No tenant
-- business data, license rows, or previous lifecycle records are removed.
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

CREATE TYPE "SubscriptionActionSource" AS ENUM ('CUSTOMER', 'ADMIN', 'SYSTEM');

ALTER TABLE "SubscriptionLifecycleEvent"
  ADD COLUMN "subscriptionId" TEXT,
  ADD COLUMN "actionSource" "SubscriptionActionSource" NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "finalizedAt" TIMESTAMP(3),
  ADD COLUMN "durationDays" INTEGER,
  ADD COLUMN "bonusDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "codeFingerprint" TEXT,
  ADD COLUMN "reason" TEXT;

CREATE INDEX "SubscriptionLifecycleEvent_subscriptionId_createdAt_idx" ON "SubscriptionLifecycleEvent"("subscriptionId", "createdAt");
