import { getCurrentUser } from "@/lib/auth/current-user";
import { getCompanySubscriptionHistory, getSubscriptionEntitlement } from "@/lib/subscriptions/service";
import { getSubscriptionPricing } from "@/lib/subscriptions/pricing";
import PaymentOnlineClient from "@/components/subscriptions/PaymentOnlineClient";

export default async function PaymentOnlinePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [entitlement, history] = await Promise.all([getSubscriptionEntitlement(user.companyId), getCompanySubscriptionHistory(user.companyId)]);
  return <PaymentOnlineClient initialEntitlement={{ ...entitlement, activatedAt: entitlement.activatedAt?.toISOString() || null, expiresAt: entitlement.expiresAt?.toISOString() || null, serverNow: entitlement.serverNow.toISOString() }} history={history.map((event) => ({ ...event, activatedAt: event.activatedAt?.toISOString() || null, expiresAt: event.expiresAt?.toISOString() || null, finalizedAt: event.finalizedAt?.toISOString() || null, createdAt: event.createdAt.toISOString(), licenseCode: event.licenseCode ? { codeHash: event.licenseCode.codeHash } : null }))} pricing={getSubscriptionPricing()} />;
}
