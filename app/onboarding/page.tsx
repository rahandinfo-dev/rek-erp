import { redirect } from "next/navigation";
import OnboardingExperience from "@/components/onboarding/OnboardingExperience";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasAcceptedCurrentOnboarding } from "@/lib/onboarding/service";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (await hasAcceptedCurrentOnboarding(user.id)) redirect("/dashboard");
  return <OnboardingExperience userName={user.fullName} />;
}
