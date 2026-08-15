"use client";

import { memo, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut, Search } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { filterSidebarGroups, isSidebarActive } from "@/lib/navigation/sidebar";
import FavoritesSidebar from "@/components/favorites/FavoritesSidebar";
import { UnsavedDotBadge } from "@/components/unsaved/HeaderSaveStatus";
import { useSaveGuard } from "@/lib/unsaved/provider";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = {
  user: {
    fullName: string;
    company: { name: string; logo: string | null };
  };
  collapsed: boolean;
  onToggle: () => void;
};

function DashboardRail({ user, collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const saveGuard = useSaveGuard();
  const { t } = useT();
  const [navQuery, setNavQuery] = useState("");

  const groups = useMemo(
    () => filterSidebarGroups(collapsed ? "" : navQuery, t),
    [navQuery, collapsed, t]
  );

  function handleLogout() {
    saveGuard.requestAction(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <aside
      aria-label={t("nav.sidebar")}
      className={cn(
        "rek-sidebar hidden h-full shrink-0 flex-col transition-[width] duration-300 ease-out md:flex",
        collapsed
          ? "w-[68px] lg:w-[72px]"
          : "w-[260px] lg:w-[300px] xl:w-[320px]"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-3 py-3.5">
        <Link
          href="/dashboard"
          className="flex min-w-0 flex-1 items-center gap-2.5"
          title={user.company.name}
        >
          <Image
            src={user.company.logo || BRAND.logo}
            alt={t("nav.sidebarLogo", { name: user.company.name })}
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-xl border border-border object-contain"
            sizes="36px"
            unoptimized={Boolean(user.company.logo)}
            priority
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p
                  dir="auto"
                  title={user.company.name}
                  className="rek-company-name truncate text-sm font-black text-foreground"
                >
                  {user.company.name}
                </p>
                <UnsavedDotBadge />
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {BRAND.productName}
              </p>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 rounded-xl p-2 text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
          aria-label={
            collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")
          }
        >
          {collapsed ? (
            <ChevronLeft size={18} aria-hidden />
          ) : (
            <ChevronRight size={18} aria-hidden />
          )}
        </button>
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
                  const label = t(item.labelKey);
                  const active = isSidebarActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={label}
                        prefetch
                        data-active={active}
                        className={cn(
                          "rek-nav-item",
                          collapsed && "justify-center px-0"
                        )}
                      >
                        <Icon size={18} className="shrink-0" aria-hidden />
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
        <div
          className={cn(
            "mb-2 flex items-center gap-2.5 rounded-2xl bg-muted/50 px-2.5 py-2",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-xs font-black text-primary">
            {user.fullName.charAt(0)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-foreground">
                {user.fullName}
              </p>
              <p
                dir="auto"
                title={user.company.name}
                className="rek-company-name truncate text-[10px] text-muted-foreground"
              >
                {user.company.name}
              </p>
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          aria-label={t("common.logout")}
          className="h-9 w-full justify-center text-destructive hover:bg-destructive/8 hover:text-destructive"
        >
          <LogOut size={16} aria-hidden />
          {!collapsed && <span>{t("common.logout")}</span>}
        </Button>
      </div>
    </aside>
  );
}

export default memo(DashboardRail);
