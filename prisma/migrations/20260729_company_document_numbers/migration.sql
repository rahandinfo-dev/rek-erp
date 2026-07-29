-- Document sequences are company-scoped. Preserve existing data while allowing
-- separate companies to use the same human-readable number.
ALTER TABLE "Purchase" DROP CONSTRAINT IF EXISTS "Purchase_invoiceNo_key";
ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "Sale_invoiceNo_key";
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_invoiceNo_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Purchase_companyId_invoiceNo_key"
  ON "Purchase"("companyId", "invoiceNo");
CREATE UNIQUE INDEX IF NOT EXISTS "Sale_companyId_invoiceNo_key"
  ON "Sale"("companyId", "invoiceNo");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_companyId_invoiceNo_key"
  ON "Invoice"("companyId", "invoiceNo");
