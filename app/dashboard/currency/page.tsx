import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { resolveCurrencyCode } from "@/lib/currency/catalog";
import CurrencyManager from "@/components/currency/CurrencyManager";

export default async function CurrencyPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const settings = await db.settings.findUnique({
    where: { companyId: user.companyId },
    select: { currency: true },
  });

  return (
    <CurrencyManager
      initialCurrency={resolveCurrencyCode(settings?.currency)}
    />
  );
}
