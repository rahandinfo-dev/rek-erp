-- Additive receipt snapshots. Existing rows remain readable through nullable fallbacks.
ALTER TABLE "PurchaseItem"
  ADD COLUMN "productNameSnapshot" TEXT,
  ADD COLUMN "productSkuSnapshot" TEXT,
  ADD COLUMN "unitSnapshot" TEXT;

ALTER TABLE "InvoiceItem"
  ADD COLUMN "unit" TEXT,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'IQD',
  ADD COLUMN "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "tax" DECIMAL(12,2) NOT NULL DEFAULT 0;
