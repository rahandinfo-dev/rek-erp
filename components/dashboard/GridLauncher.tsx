"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole, X } from "lucide-react";
import { APP_GRID } from "@/lib/navigation/app-grid";
import { isNavigationVisible } from "@/lib/navigation/visibility";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/LocaleProvider";
import { isSubscriptionProtectedHref } from "@/lib/subscriptions/paths";
import type { NavigationStyle } from "@/lib/navigation/styles";

type Props = {
  open: boolean;
  onClose: () => void;
  subscriptionActive: boolean;
  style?: NavigationStyle;
};

export default function GridLauncher({ open, onClose, subscriptionActive, style = "GRID" }: Props) {
  const pathname = usePathname();
  const { t } = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label={t("nav.closeAppsMenu")}
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.appsMenu")}
        className={cn("absolute inset-x-3 top-[max(8%,env(safe-area-inset-top))] mx-auto max-h-[min(82vh,900px)] w-full max-w-3xl overflow-hidden rounded-[28px] border border-border bg-card text-card-foreground shadow-[0_30px_80px_var(--shadow-brand)] animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300 sm:inset-x-auto sm:left-1/2 sm:right-auto sm:w-[min(920px,92vw)] sm:-translate-x-1/2", style === "SHEET" && "top-auto bottom-0 rounded-b-none sm:bottom-4 sm:rounded-[28px]", style === "THREE_DOTS" && "max-w-sm", style === "RUDDER" && "max-w-2xl")}
      >
        <div className="flex items-center justify-between border-b border-border bg-secondary px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-primary/70">
              {BRAND.nameEn}
            </p>
            <h2 className="text-xl font-black text-primary sm:text-2xl">
              {t("nav.appsMenuTitle", { name: BRAND.nameKu })}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-2xl border border-border bg-card p-2.5 text-primary transition hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/35"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="max-h-[calc(80vh-88px)] overflow-y-auto bg-card p-4 sm:p-6">
          <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4", style === "THREE_DOTS" && "grid-cols-1 sm:grid-cols-1", style === "RECTANGULAR" && "grid-cols-1 sm:grid-cols-2", style === "RUDDER" && "sm:grid-cols-3") }>
            {APP_GRID.filter((item) => isNavigationVisible(item.href)).map((item) => {
              const Icon = item.icon;
              const locked = !subscriptionActive && isSubscriptionProtectedHref(item.href);
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={locked ? "/dashboard/payment-online" : item.href}
                  onClick={onClose}
                  className={cn(
                    "rek-grid-tile flex flex-col items-start gap-3 p-4 sm:p-5",
                    style === "RECTANGULAR" && "flex-row items-center",
                    style === "RUDDER" && "items-center text-center rounded-full aspect-square justify-center",
                    active && "border-primary bg-secondary shadow-lg",
                    locked && "opacity-65"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-primary"
                    )}
                  >
                    {locked ? <LockKeyhole size={22} aria-hidden /> : <Icon size={22} aria-hidden />}
                  </span>
                  <div>
                    <p className="font-bold text-foreground">
                      {t(item.titleKey)}
                    </p>
                    {item.descriptionKey ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t(item.descriptionKey)}
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
