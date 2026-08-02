-- Persist every monetary value needed to reproduce a receipt without consulting
-- mutable product data or deriving payment state at render time.
ALTER TABLE "Sale" ADD COLUMN "paidAmount" DECIMAL(12,2),
  ADD COLUMN "remainingBalance" DECIMAL(12,2);
ALTER TABLE "Purchase" ADD COLUMN "paidAmount" DECIMAL(12,2),
  ADD COLUMN "remainingBalance" DECIMAL(12,2);
ALTER TABLE "SaleItem" ADD COLUMN "discount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseItem" ADD COLUMN "discount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "paidAmount" DECIMAL(12,2),
  ADD COLUMN "remainingBalance" DECIMAL(12,2);

-- Historical rows remain NULL: the old schema never recorded payment state, so
-- assigning zero or deriving it from a payment method would fabricate history.
