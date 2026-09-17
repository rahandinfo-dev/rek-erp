import { db } from "@/lib/prisma/db";
import { CURRENT_ONBOARDING_VERSION } from "@/lib/onboarding/constants";

export { CURRENT_ONBOARDING_VERSION } from "@/lib/onboarding/constants";

export async function hasAcceptedCurrentOnboarding(userId: string) {
  const acceptance = await db.userOnboardingAcceptance.findUnique({
    where: {
      userId_version: { userId, version: CURRENT_ONBOARDING_VERSION },
    },
    select: { id: true },
  });

  return Boolean(acceptance);
}

export async function acceptCurrentOnboarding(userId: string) {
  return db.userOnboardingAcceptance.upsert({
    where: {
      userId_version: { userId, version: CURRENT_ONBOARDING_VERSION },
    },
    create: { userId, version: CURRENT_ONBOARDING_VERSION },
    // Preserve the original acceptance time when a request is retried.
    update: {},
    select: { id: true, version: true, acceptedAt: true },
  });
}
