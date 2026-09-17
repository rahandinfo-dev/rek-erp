-- Preserve historical provider-payment evidence while removing the obsolete
-- Rasedi-specific database object names. No rows are deleted.
ALTER TABLE "RasediPayment" RENAME TO "LegacyProviderPaymentArchive";
ALTER TABLE "LegacyProviderPaymentArchive" RENAME CONSTRAINT "RasediPayment_pkey" TO "LegacyProviderPaymentArchive_pkey";
ALTER TABLE "LegacyProviderPaymentArchive" RENAME CONSTRAINT "RasediPayment_companyId_fkey" TO "LegacyProviderPaymentArchive_companyId_fkey";
ALTER INDEX "RasediPayment_providerReference_key" RENAME TO "LegacyProviderPaymentArchive_providerReference_key";
ALTER INDEX "RasediPayment_companyId_createdAt_idx" RENAME TO "LegacyProviderPaymentArchive_companyId_createdAt_idx";
ALTER INDEX "RasediPayment_providerStatus_createdAt_idx" RENAME TO "LegacyProviderPaymentArchive_providerStatus_createdAt_idx";
