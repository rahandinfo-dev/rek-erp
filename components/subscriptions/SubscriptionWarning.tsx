import Link from "next/link";
import { Clock3 } from "lucide-react";
import type { SubscriptionEntitlement } from "@/lib/subscriptions/service";

export default function SubscriptionWarning({ entitlement }: { entitlement: SubscriptionEntitlement }) {
  if (!entitlement.active || !entitlement.expiresSoon || entitlement.remainingDays === null) return null;
  return <div className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm sm:mx-4 md:mx-5 lg:mx-6 xl:mx-8" dir="rtl">
    <p className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200"><Clock3 size={17} aria-hidden /> بەشداربوونت لە {entitlement.remainingDays} ڕۆژدا بەسەر دەچێت.</p>
    <Link href="/dashboard/payment-online" className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-black text-white">نوێکردنەوە</Link>
  </div>;
}
