-- Versioned onboarding/legal acceptance evidence. This is additive: it does
-- not alter or delete existing user, company, or business records.
CREATE TABLE "UserOnboardingAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserOnboardingAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserOnboardingAcceptance_userId_version_key"
    ON "UserOnboardingAcceptance"("userId", "version");

CREATE INDEX "UserOnboardingAcceptance_userId_acceptedAt_idx"
    ON "UserOnboardingAcceptance"("userId", "acceptedAt");

ALTER TABLE "UserOnboardingAcceptance"
    ADD CONSTRAINT "UserOnboardingAcceptance_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
