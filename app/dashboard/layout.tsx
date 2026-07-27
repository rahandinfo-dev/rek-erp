import { cookies } from "next/headers";
import DashboardShell, {
  SIDEBAR_COLLAPSE_COOKIE,
} from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma/db";
import { resolveCurrencyCode } from "@/lib/currency/catalog";
import { setRuntimeCurrency } from "@/lib/currency/runtime";

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

  const settings = await db.settings.findUnique({
    where: { companyId: user.companyId },
    select: { currency: true },
  });
  const currency = resolveCurrencyCode(settings?.currency);
  setRuntimeCurrency(currency);

  const currentUser = {
    id: user.id,
    companyId: user.companyId,
    fullName: user.fullName,
    avatar: user.avatar,
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
    >
      {children}
    </DashboardShell>
  );
}
