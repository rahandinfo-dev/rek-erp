-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "image" TEXT;
