"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { LayoutGrid, Sparkles } from "lucide-react";
import { BRAND } from "@/lib/brand";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import HeaderConnectionStatus from "@/components/recovery/HeaderConnectionStatus";
import HeaderSaveStatus from "@/components/unsaved/HeaderSaveStatus";
import FavoriteStarButton from "@/components/favorites/FavoriteStarButton";
import InstallAppButton from "@/components/pwa/InstallAppButton";
import { toggleAiAssistant } from "@/lib/ai/bus";

const GlobalSearch = dynamic(
  () => import("@/components/search/GlobalSearch"),
  {
    ssr: false,
    loading: () => (
      <div className="hidden h-10 w-full max-w-[420px] animate-pulse rounded-xl bg-muted md:block" />
    ),
  }
);

const NotificationBell = dynamic(
  () => import("@/components/notifications/NotificationBell"),
  {
    ssr: false,
    loading: () => (
      <div className="size-10 animate-pulse rounded-xl bg-muted" />
    ),
  }
);

type DashboardHeaderProps = {
  user: {
    fullName: string;
    avatar?: string | null;
    company: {
      name: string;
      logo: string | null;
    };
  };
  onOpenLauncher: () => void;
};

function DashboardHeader({ user, onOpenLauncher }: DashboardHeaderProps) {
  return (
    <header className="rek-header w-full shrink-0 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="flex h-14 max-w-full items-center justify-between gap-2 md:h-15 lg:h-16">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onOpenLauncher}
            aria-label="کردنەوەی مێنیوی ئەپەکان"
            className="h-10 shrink-0 gap-2 rounded-xl border-border bg-card px-3 shadow-none"
          >
            <LayoutGrid size={18} aria-hidden />
            <span className="hidden text-sm font-bold sm:inline">ئەپەکان</span>
          </Button>

          <GlobalSearch className="hidden min-w-0 flex-1 md:block md:max-w-[min(100%,340px)] lg:max-w-[min(100%,440px)] xl:max-w-[520px]" />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
          <FavoriteStarButton iconOnly className="hidden sm:inline-flex" />
          <HeaderSaveStatus className="hidden md:inline-flex" />
          <InstallAppButton className="hidden lg:inline-flex" />
          <HeaderConnectionStatus />
          <ThemeToggle />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => toggleAiAssistant()}
            aria-label="کردنەوەی یاریدەدەری زیرەک"
            title="یاریدەدەری زیرەک"
            className="size-10 shrink-0 rounded-xl border-border bg-card shadow-none"
          >
            <Sparkles size={18} aria-hidden />
          </Button>
          <NotificationBell />

          <div className="flex min-w-0 max-w-[36vw] items-center gap-2 border-r border-border pr-2 sm:max-w-none sm:gap-2.5 sm:pr-3">
            <div className="hidden min-w-0 text-right lg:block">
              <p className="max-w-[9rem] truncate text-sm font-bold text-foreground xl:max-w-[12rem]">
                {user.fullName}
              </p>
              <p className="max-w-[9rem] truncate text-xs text-muted-foreground xl:max-w-[12rem]">
                {user.company.name}
              </p>
            </div>

            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={user.fullName}
                width={36}
                height={36}
                className="size-9 shrink-0 rounded-full border border-border object-cover"
                sizes="36px"
                unoptimized
              />
            ) : (
              <Image
                src={user.company.logo || BRAND.logo}
                alt={`لۆگۆی ${user.company.name}`}
                width={36}
                height={36}
                className="size-9 shrink-0 rounded-xl border border-border object-contain"
                sizes="36px"
                unoptimized={Boolean(user.company.logo)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="pb-2.5 md:hidden">
        <GlobalSearch mobile />
      </div>
    </header>
  );
}

export default memo(DashboardHeader);
