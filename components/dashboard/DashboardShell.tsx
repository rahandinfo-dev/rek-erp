"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useMediaQuery } from "@/lib/hooks/useBrowserStore";
import DashboardRail from "@/components/dashboard/DashboardRail";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import NotificationSync from "@/components/notifications/NotificationSync";
import PwaProvider from "@/components/pwa/PwaProvider";
import { DraftOwnerProvider } from "@/lib/drafts/owner";
import { UndoProvider } from "@/lib/undo/provider";
import { SessionRecoveryProvider } from "@/lib/recovery/provider";
import { NavigationHistoryProvider } from "@/lib/history/provider";
import { FavoritesProvider } from "@/lib/favorites/provider";
import { KeyboardProductivityProvider } from "@/lib/command/keyboardProvider";
import { SaveGuardProvider } from "@/lib/unsaved/provider";
import { QuickActionsProvider } from "@/lib/quick-actions/provider";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { useT } from "@/components/i18n/LocaleProvider";

const GridLauncher = dynamic(
  () => import("@/components/dashboard/GridLauncher"),
  { ssr: false }
);

const CommandPaletteHost = dynamic(
  () =>
    import("@/components/command/CommandPalette").then(
      (m) => m.CommandPaletteHost
    ),
  { ssr: false }
);

const CheatSheetHost = dynamic(
  () => import("@/components/command/CheatSheet"),
  { ssr: false }
);

const AiAssistantPanel = dynamic(
  () => import("@/components/ai/AiAssistantPanel"),
  { ssr: false }
);

export const SIDEBAR_COLLAPSE_COOKIE = "rek-sidebar-collapsed";

const COLLAPSE_MAX_AGE = 60 * 60 * 24 * 365;

function persistCollapsed(collapsed: boolean) {
  try {
    document.cookie = `${SIDEBAR_COLLAPSE_COOKIE}=${
      collapsed ? "1" : "0"
    }; path=/; max-age=${COLLAPSE_MAX_AGE}; samesite=lax`;
  } catch {
    // ignore
  }
}

type UserInfo = {
  id: string;
  companyId: string;
  fullName: string;
  avatar?: string | null;
  company: {
    name: string;
    logo: string | null;
  };
};

export default function DashboardShell({
  user,
  initialCollapsed = false,
  children,
}: {
  user: UserInfo;
  initialCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useT();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  // Narrow viewports collapse the sidebar. The media query is read through a
  // store so the server render (always false) matches hydration; collapsing is
  // then applied when the value actually flips, and the user can still expand
  // again afterwards.
  const narrow = useMediaQuery("(max-width: 1279px)");
  const [lastNarrow, setLastNarrow] = useState(false);
  if (narrow !== lastNarrow) {
    setLastNarrow(narrow);
    if (narrow) setCollapsed(true);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLauncherOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      persistCollapsed(next);
      return next;
    });
  }, []);

  return (
    <DraftOwnerProvider userId={user.id} companyId={user.companyId}>
      <UndoProvider userId={user.id} companyId={user.companyId}>
      <SessionRecoveryProvider userId={user.id} companyId={user.companyId}>
      <NavigationHistoryProvider userId={user.id} companyId={user.companyId}>
      <FavoritesProvider userId={user.id} companyId={user.companyId}>
      <SaveGuardProvider userId={user.id} companyId={user.companyId}>
      <QuickActionsProvider userId={user.id} companyId={user.companyId}>
      <KeyboardProductivityProvider
        userId={user.id}
        companyId={user.companyId}
      >
      <PwaProvider>
      <div className="rek-shell flex min-w-0 overflow-hidden bg-background text-foreground">
        <NotificationSync />
        <DashboardRail
          user={user}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <DashboardHeader
            user={user}
            onOpenLauncher={() => setLauncherOpen(true)}
          />

          <main
            id="main-content"
            tabIndex={-1}
            className="rek-page rek-page-enter min-h-0 flex-1 overflow-y-auto overflow-x-clip overscroll-y-contain bg-background p-3 text-foreground outline-none sm:p-4 md:p-5 lg:p-6 xl:p-8"
          >
            <ErrorBoundary
              area="dashboard.main"
              fallbackTitle={t("nav.pageError")}
            >
              {children}
            </ErrorBoundary>
          </main>
        </div>

        {launcherOpen ? (
          <GridLauncher
            open={launcherOpen}
            onClose={() => setLauncherOpen(false)}
          />
        ) : null}
        <CommandPaletteHost />
        <CheatSheetHost />
        <AiAssistantPanel />
      </div>
      </PwaProvider>
      </KeyboardProductivityProvider>
      </QuickActionsProvider>
      </SaveGuardProvider>
      </FavoritesProvider>
      </NavigationHistoryProvider>
      </SessionRecoveryProvider>
      </UndoProvider>
    </DraftOwnerProvider>
  );
}
