import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSubscriptionEntitlement, SUBSCRIPTION_LOCK_MESSAGE } from "@/lib/subscriptions/service";

export default async function SubscriptionModuleGate({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const entitlement = user ? await getSubscriptionEntitlement(user.companyId) : null;
  if (entitlement?.active) return children;
  return (
    <div className="relative min-h-[22rem]" aria-describedby="subscription-lock-message">
      <div className="pointer-events-none select-none opacity-45 grayscale-[.3]" aria-hidden>
        {children}
      </div>
      <section className="absolute inset-x-3 top-8 z-20 mx-auto max-w-lg rounded-3xl border border-primary/25 bg-card/95 p-5 text-center shadow-[0_22px_60px_var(--shadow-brand)] backdrop-blur sm:top-12 sm:p-7" dir="rtl">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary"><LockKeyhole size={23} aria-hidden /></span>
        <h2 className="mt-4 text-xl font-black text-foreground">بەشەکە داخراوە</h2>
        <p id="subscription-lock-message" className="mt-2 text-sm leading-7 text-muted-foreground">{SUBSCRIPTION_LOCK_MESSAGE}</p>
        <Link href="/dashboard/payment-online" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground transition hover:brightness-95">Payment Online</Link>
      </section>
    </div>
  );
}
