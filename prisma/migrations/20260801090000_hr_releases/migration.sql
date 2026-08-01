-- Additive HR and user-facing release history upgrade. Existing records remain valid.
ALTER TYPE "EmployeeStatus" ADD VALUE IF NOT EXISTS 'ON_LEAVE';
ALTER TYPE "EmployeeStatus" ADD VALUE IF NOT EXISTS 'ABSENT';
ALTER TYPE "EmployeeStatus" ADD VALUE IF NOT EXISTS 'LATE';
ALTER TYPE "EmployeeStatus" ADD VALUE IF NOT EXISTS 'TERMINATED';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "nationalIdImage" TEXT,
  ADD COLUMN IF NOT EXISTS "salaryCurrency" TEXT NOT NULL DEFAULT 'IQD',
  ADD COLUMN IF NOT EXISTS "salaryDueDay" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkIn" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "checkOut" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lateMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isAbsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isLeave" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SalaryPayment" ADD COLUMN IF NOT EXISTS "remainingAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'IQD',
  ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH';
DROP INDEX IF EXISTS "SalaryPayment_employeeId_month_year_key";
CREATE INDEX IF NOT EXISTS "SalaryPayment_employeeId_month_year_idx" ON "SalaryPayment"("employeeId", "month", "year");
CREATE TABLE IF NOT EXISTS "SalaryDeduction" ("id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE, "employeeId" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE, "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP, "reason" TEXT NOT NULL, "source" TEXT NOT NULL, "amount" DECIMAL(14,2) NOT NULL, "salaryPeriod" TEXT NOT NULL, "approved" BOOLEAN NOT NULL DEFAULT true, "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL, "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS "SalaryDeduction_companyId_salaryPeriod_idx" ON "SalaryDeduction"("companyId", "salaryPeriod");
CREATE INDEX IF NOT EXISTS "SalaryDeduction_employeeId_salaryPeriod_idx" ON "SalaryDeduction"("employeeId", "salaryPeriod");
CREATE TABLE IF NOT EXISTS "EmployeePerformance" ("id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE, "employeeId" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE, "period" TEXT NOT NULL, "score" INTEGER NOT NULL, "attendanceContribution" INTEGER, "notes" TEXT, "reviewerId" TEXT REFERENCES "User"("id") ON DELETE SET NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS "EmployeePerformance_companyId_period_idx" ON "EmployeePerformance"("companyId", "period");
CREATE INDEX IF NOT EXISTS "EmployeePerformance_employeeId_period_idx" ON "EmployeePerformance"("employeeId", "period");
CREATE TABLE IF NOT EXISTS "AppRelease" ("id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE, "version" TEXT NOT NULL, "title" TEXT NOT NULL, "releaseDate" DATE NOT NULL, "summary" TEXT NOT NULL, "changes" TEXT, "publishedAt" TIMESTAMP(3), "isCurrent" BOOLEAN NOT NULL DEFAULT false, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS "AppRelease_companyId_version_key" ON "AppRelease"("companyId", "version");
CREATE INDEX IF NOT EXISTS "AppRelease_companyId_publishedAt_idx" ON "AppRelease"("companyId", "publishedAt");
CREATE TABLE IF NOT EXISTS "AppReleaseRead" ("id" TEXT PRIMARY KEY, "releaseId" TEXT NOT NULL REFERENCES "AppRelease"("id") ON DELETE CASCADE, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS "AppReleaseRead_releaseId_userId_key" ON "AppReleaseRead"("releaseId", "userId");
CREATE INDEX IF NOT EXISTS "AppReleaseRead_userId_readAt_idx" ON "AppReleaseRead"("userId", "readAt");
ALTER TABLE "Settings" ALTER COLUMN "fontFamily" SET DEFAULT 'NRT';
