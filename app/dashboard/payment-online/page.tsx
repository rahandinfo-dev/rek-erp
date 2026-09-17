import { getCurrentUser } from "@/lib/auth/current-user";
import { getSubscriptionEntitlement } from "@/lib/subscriptions/service";
import { getSubscriptionPricing } from "@/lib/subscriptions/pricing";
import PaymentOnlineClient from "@/components/subscriptions/PaymentOnlineClient";

export default async function PaymentOnlinePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const entitlement = await getSubscriptionEntitlement(user.companyId);
  return <PaymentOnlineClient pageTitle="داواکردنی سیستەمی REK" initialEntitlement={{ ...entitlement, activatedAt: entitlement.activatedAt?.toISOString() || null, expiresAt: entitlement.expiresAt?.toISOString() || null, serverNow: entitlement.serverNow.toISOString() }} pricing={getSubscriptionPricing()} />;
}
