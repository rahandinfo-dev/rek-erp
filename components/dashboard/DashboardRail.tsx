"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterSidebarGroups, isSidebarActive } from "@/lib/navigation/sidebar";
import FavoritesSidebar from "@/components/favorites/FavoritesSidebar";
import { UnsavedDotBadge } from "@/components/unsaved/HeaderSaveStatus";
import { useT } from "@/components/i18n/LocaleProvider";
import { isSubscriptionProtectedHref } from "@/lib/subscriptions/paths";
import {
  NavigationBrand,
  NavigationLogout,
  NavigationToggle,
  NavigationUserProfile,
  type NavigationUser,
} from "@/components/dashboard/NavigationPrimitives";

type Props = {
  user: NavigationUser;
  collapsed: boolean;
  onToggle: () => void;
  subscriptionActive: boolean;
};

function DashboardRail({ user, collapsed, onToggle, subscriptionActive }: Props) {
  const pathname = usePathname();
  const { t } = useT();
  const [navQuery, setNavQuery] = useState("");

  const groups = useMemo(
    () => filterSidebarGroups(collapsed ? "" : navQuery, t),
    [navQuery, collapsed, t]
  );

  return (
    <aside
      dir="auto"
      aria-label={t("nav.sidebar")}
      className={cn(
        "rek-sidebar rek-navigation-width flex h-full shrink-0 flex-col",
        collapsed
          ? "w-[68px] lg:w-[72px]"
          : "w-[260px] lg:w-[300px] xl:w-[320px]"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-3 py-3.5">
        <NavigationBrand user={user} collapsed={collapsed} trailing={<UnsavedDotBadge />} />
        <NavigationToggle collapsed={collapsed} onToggle={onToggle} />
      </div>

      {!collapsed && (
        <div className="border-b border-sidebar-border px-3 py-2.5">
          <label className="relative block">
            <Search
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder={t("nav.searchMenu")}
              aria-label={t("nav.searchMenuAria")}
              className="h-9 w-full rounded-xl border border-transparent bg-muted/70 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:bg-card focus-visible:ring-[3px] focus-visible:ring-ring/25"
            />
          </label>
        </div>
      )}

      <nav
        className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-2 py-3"
        aria-label={t("nav.mainMenu")}
      >
        <FavoritesSidebar collapsed={collapsed} />

        {groups.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {t("nav.noSectionFound")}
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.id}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                  {t(group.labelKey)}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const translatedLabel = t(item.labelKey);
                  // Keep text nodes stable through hydration if an in-flight
                  // client refresh ever observes an incomplete catalog.
                  const label = translatedLabel === item.labelKey ? "" : translatedLabel;
                  const active = isSidebarActive(pathname, item.href);
                  const locked = !subscriptionActive && isSubscriptionProtectedHref(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={locked ? "/dashboard/payment-online" : item.href}
                        title={locked ? "بۆ بەکارهێنانی ئەم بەشە پێویستە بەشداربوونت چالاک بێت." : label}
                        prefetch
                        data-active={active}
                        aria-disabled={locked || undefined}
                        className={cn(
                          "rek-nav-item",
                          collapsed && "justify-center px-0",
                          locked && "opacity-65"
                        )}
                      >
                        {locked ? <LockKeyhole size={18} className="shrink-0" aria-hidden /> : <Icon size={18} className="shrink-0" aria-hidden />}
                        {!collapsed && (
                          <span className="truncate text-[13px] font-semibold">
                            {label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>

      <div className="border-t border-sidebar-border p-2.5">
        <NavigationUserProfile user={user} collapsed={collapsed} className="mb-2" />
        <NavigationLogout compact={collapsed} />
      </div>
    </aside>
  );
}

export default memo(DashboardRail);
