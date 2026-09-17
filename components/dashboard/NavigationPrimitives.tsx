"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { useState } from "react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/LocaleProvider";
import { useSaveGuard } from "@/lib/unsaved/provider";

export type NavigationUser = {
  fullName: string;
  avatar?: string | null;
  company: {
    name: string;
    logo: string | null;
  };
};

export function NavigationBrand({
  user,
  collapsed = false,
  trailing,
  className,
}: {
  user: NavigationUser;
  collapsed?: boolean;
  trailing?: React.ReactNode;
  className?: string;
}) {
  const { t } = useT();

  return (
    <Link
      href="/dashboard"
      className={cn("rek-navigation-brand flex min-w-0 flex-1 items-center gap-2.5", className)}
      title={user.company.name}
    >
      <Image
        src={user.company.logo || BRAND.logo}
        alt={t("nav.sidebarLogo", { name: user.company.name })}
        width={user.company.logo ? 36 : 112}
        height={36}
        className={cn(
          "shrink-0 object-contain",
          user.company.logo ? "size-9 border border-border" : "h-9 w-28",
        )}
        sizes={user.company.logo ? "36px" : "112px"}
        unoptimized={Boolean(user.company.logo)}
        priority
      />
      {!collapsed ? (
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span
              dir="auto"
              className="rek-company-name truncate text-sm font-black text-foreground"
            >
              {user.company.name}
            </span>
            {trailing}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {BRAND.productName}
          </span>
        </span>
      ) : null}
    </Link>
  );
}

export function NavigationUserProfile({
  user,
  collapsed = false,
  className,
}: {
  user: NavigationUser;
  collapsed?: boolean;
  className?: string;
}) {
  const { t } = useT();
  const initials = user.fullName.trim().charAt(0) || "?";

  return (
    <div
      className={cn(
        "rek-navigation-user flex min-w-0 items-center gap-2.5 bg-sidebar px-2.5 py-2 text-sidebar-foreground",
        collapsed && "justify-center px-0",
        className,
      )}
    >
      {user.avatar ? (
        <Image
          src={user.avatar}
          alt={user.fullName}
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-full border border-border object-cover"
          sizes="32px"
          unoptimized
        />
      ) : user.company.logo ? (
        <Image
          src={user.company.logo}
          alt={t("nav.companyLogo", { name: user.company.name })}
          width={32}
          height={32}
          className="size-8 shrink-0 border border-border object-contain"
          sizes="32px"
          unoptimized
        />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center bg-primary/15 text-xs font-black text-primary">
          {initials}
        </span>
      )}
      {!collapsed ? (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-sidebar-foreground">
            {user.fullName}
          </span>
          <span
            dir="auto"
            title={user.company.name}
            className="rek-company-name block truncate text-[10px] text-sidebar-muted"
          >
            {user.company.name}
          </span>
        </span>
      ) : null}
    </div>
  );
}

export function NavigationToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useT();

  return (
    <button
      type="button"
      onClick={onToggle}
      className="rek-navigation-toggle shrink-0 p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
      aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
      aria-expanded={!collapsed}
    >
      {collapsed ? <ChevronLeft size={18} aria-hidden /> : <ChevronRight size={18} aria-hidden />}
    </button>
  );
}

export function NavigationLogout({
  onComplete,
  compact = false,
  tile = false,
}: {
  onComplete?: () => void;
  compact?: boolean;
  tile?: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const saveGuard = useSaveGuard();
  const [busy, setBusy] = useState(false);

  function logout() {
    if (busy) return;
    saveGuard.requestAction(async () => {
      if (busy) return;
      setBusy(true);
      try {
        const response = await fetch("/api/auth/logout", { method: "POST" });
        if (!response.ok) return;
        onComplete?.();
        router.replace("/login");
        router.refresh();
      } finally {
        setBusy(false);
      }
    });
  }

  if (tile) {
    return (
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        className="flex min-h-[94px] flex-col items-center justify-center gap-2 border border-transparent p-2 text-center text-xs font-bold text-destructive transition hover:border-destructive/35 hover:bg-destructive/5 focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:opacity-60"
      >
        <LogOut size={21} aria-hidden />
        <span className="line-clamp-2">{t("common.logout")}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      title={t("common.logout")}
      aria-label={t("common.logout")}
      className={cn(
        "rek-navigation-logout flex min-w-0 items-center gap-3 border border-transparent text-sm font-bold text-destructive outline-none transition hover:border-destructive/25 hover:bg-destructive/8 focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:opacity-60",
        compact ? "justify-center p-2" : "w-full p-3",
      )}
    >
      <LogOut size={18} aria-hidden />
      {!compact ? <span className="min-w-0 flex-1 truncate">{t("common.logout")}</span> : null}
    </button>
  );
}
