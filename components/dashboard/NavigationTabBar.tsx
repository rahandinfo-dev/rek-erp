"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { APP_GRID } from "@/lib/navigation/app-grid";
import { isNavigationVisible } from "@/lib/navigation/visibility";
import { isSubscriptionProtectedHref } from "@/lib/subscriptions/paths";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export default function NavigationTabBar({ subscriptionActive }: { subscriptionActive: boolean }) {
  const pathname = usePathname();
  const { t } = useT();
  return <nav aria-label={t("nav.mainMenu")} className="border-b border-border bg-card px-3 py-2"><div className="flex gap-2 overflow-x-auto pb-1">{APP_GRID.filter((item) => isNavigationVisible(item.href)).map((item) => { const Icon = item.icon; const locked = !subscriptionActive && isSubscriptionProtectedHref(item.href); const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)); return <Link key={item.href} href={locked ? "/dashboard/payment-online" : item.href} className={cn("inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold", active && "border-primary bg-primary/10 text-primary", locked && "opacity-65")}><>{locked ? <LockKeyhole size={15} /> : <Icon size={15} />}</><span>{t(item.titleKey)}</span></Link>; })}</div></nav>;
}
