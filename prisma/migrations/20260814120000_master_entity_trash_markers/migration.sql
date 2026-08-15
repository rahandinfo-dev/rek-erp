-- Additive trash markers keep authoritative rows and relations intact.
ALTER TABLE "Warehouse" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Category" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Unit" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Brand" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Product" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Customer" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Employee" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Sale" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;
ALTER TABLE "InvoiceTemplate" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT;

CREATE INDEX "Warehouse_companyId_deletedAt_idx" ON "Warehouse"("companyId", "deletedAt");
CREATE INDEX "Category_companyId_deletedAt_idx" ON "Category"("companyId", "deletedAt");
CREATE INDEX "Unit_companyId_deletedAt_idx" ON "Unit"("companyId", "deletedAt");
CREATE INDEX "Brand_companyId_deletedAt_idx" ON "Brand"("companyId", "deletedAt");
CREATE INDEX "Product_companyId_deletedAt_idx" ON "Product"("companyId", "deletedAt");
CREATE INDEX "Supplier_companyId_deletedAt_idx" ON "Supplier"("companyId", "deletedAt");
CREATE INDEX "Customer_companyId_deletedAt_idx" ON "Customer"("companyId", "deletedAt");
CREATE INDEX "Employee_companyId_deletedAt_idx" ON "Employee"("companyId", "deletedAt");
CREATE INDEX "Sale_companyId_deletedAt_idx" ON "Sale"("companyId", "deletedAt");
CREATE INDEX "Purchase_companyId_deletedAt_idx" ON "Purchase"("companyId", "deletedAt");
CREATE INDEX "Invoice_companyId_deletedAt_idx" ON "Invoice"("companyId", "deletedAt");
CREATE INDEX "InvoiceTemplate_companyId_deletedAt_idx" ON "InvoiceTemplate"("companyId", "deletedAt");
