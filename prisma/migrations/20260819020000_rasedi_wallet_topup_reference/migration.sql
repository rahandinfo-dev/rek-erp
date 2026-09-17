-- Additive provider verification fields for existing wallet top-up requests.
ALTER TABLE "WalletTopUp" ADD COLUMN "providerReference" TEXT;
ALTER TABLE "WalletTopUp" ADD COLUMN "providerStatus" TEXT;
CREATE UNIQUE INDEX "WalletTopUp_providerReference_key" ON "WalletTopUp"("providerReference");
