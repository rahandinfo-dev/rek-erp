import { cookies } from "next/headers";
import DashboardShell, {
  SIDEBAR_COLLAPSE_COOKIE,
} from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma/db";
import { resolveCurrencyCode } from "@/lib/currency/catalog";
import { setRuntimeCurrency } from "@/lib/currency/runtime";
import { getSubscriptionEntitlement } from "@/lib/subscriptions/service";
import SubscriptionWarning from "@/components/subscriptions/SubscriptionWarning";
import { DEFAULT_NAVIGATION_STYLE, isNavigationStyle } from "@/lib/navigation/styles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);

  if (!user) {
    redirect("/login");
  }

  const collapsed = cookieStore.get(SIDEBAR_COLLAPSE_COOKIE)?.value === "1";

  const [settings, entitlement] = await Promise.all([
    db.settings.findUnique({ where: { companyId: user.companyId }, select: { currency: true } }),
    getSubscriptionEntitlement(user.companyId),
  ]);
  const currency = resolveCurrencyCode(settings?.currency);
  setRuntimeCurrency(currency);

  const currentUser = {
    id: user.id,
    companyId: user.companyId,
    fullName: user.fullName,
    avatar: user.avatar,
    navigationStyle: isNavigationStyle(user.navigationStyle) ? user.navigationStyle : DEFAULT_NAVIGATION_STYLE,
    company: {
      name: user.company.name,
      logo: user.company.logo,
    },
  };

  return (
    <DashboardShell
      user={currentUser}
      initialCollapsed={collapsed}
      initialCurrency={currency}
      subscriptionActive={entitlement.active}
      initialNavigationStyle={currentUser.navigationStyle}
    >
      <SubscriptionWarning entitlement={entitlement} />
      {children}
    </DashboardShell>
  );
}
