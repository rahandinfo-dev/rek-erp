-- Add platform-level administration without changing existing tenant data.
CREATE TABLE "SuperAdmin" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "passwordChangedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SuperAdminSession" (
  "id" TEXT NOT NULL,
  "superAdminId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuperAdminSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SuperAdminAuditLog" (
  "id" TEXT NOT NULL,
  "superAdminId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT,
  "targetId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'success',
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuperAdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- Existing issued codes retain their legacy createdById value. New platform
-- issued codes use this nullable, separately-scoped foreign key.
ALTER TABLE "LicenseCode" ADD COLUMN "createdBySuperAdminId" TEXT;

CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");
CREATE UNIQUE INDEX "SuperAdminSession_tokenHash_key" ON "SuperAdminSession"("tokenHash");
CREATE INDEX "SuperAdminSession_superAdminId_expiresAt_idx" ON "SuperAdminSession"("superAdminId", "expiresAt");
CREATE INDEX "SuperAdminSession_expiresAt_idx" ON "SuperAdminSession"("expiresAt");
CREATE INDEX "SuperAdminAuditLog_superAdminId_createdAt_idx" ON "SuperAdminAuditLog"("superAdminId", "createdAt");
CREATE INDEX "SuperAdminAuditLog_action_createdAt_idx" ON "SuperAdminAuditLog"("action", "createdAt");
CREATE INDEX "SuperAdminAuditLog_targetType_targetId_idx" ON "SuperAdminAuditLog"("targetType", "targetId");

ALTER TABLE "LicenseCode" ADD CONSTRAINT "LicenseCode_createdBySuperAdminId_fkey" FOREIGN KEY ("createdBySuperAdminId") REFERENCES "SuperAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SuperAdminSession" ADD CONSTRAINT "SuperAdminSession_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "SuperAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SuperAdminAuditLog" ADD CONSTRAINT "SuperAdminAuditLog_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "SuperAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
