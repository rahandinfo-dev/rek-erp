"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronUp, CircleEllipsis, LayoutGrid, LockKeyhole, Menu, MoreHorizontal,
  PanelRightOpen, Plus, ShipWheel, X,
} from "lucide-react";
import { getNavigationItems, isNavigationActive, NAVIGATION_GROUP_LABELS } from "@/lib/navigation/registry";
import type { NavigationStyle } from "@/lib/navigation/styles";
import { isSubscriptionProtectedHref } from "@/lib/subscriptions/paths";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/LocaleProvider";

type Props = { style: NavigationStyle; subscriptionActive: boolean };

type ListProps = {
  onNavigate?: () => void;
  subscriptionActive: boolean;
  compact?: boolean;
  className?: string;
};

function NavigationList({ onNavigate, subscriptionActive, compact = false, className }: ListProps) {
  const { t } = useT();
  const pathname = usePathname();
  const items = getNavigationItems();
  return (
    <div className={cn(className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isNavigationActive(pathname, item.href);
        const locked = !subscriptionActive && isSubscriptionProtectedHref(item.href);
        const label = t(item.labelKey);
        return (
          <Link
            key={item.id}
            href={locked ? "/dashboard/payment-online" : item.href}
            onClick={onNavigate}
            title={label}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={cn(
              "group relative flex min-w-0 items-center gap-3 rounded-xl border border-transparent text-sm font-bold outline-none transition duration-200 hover:border-primary/25 hover:bg-primary/8 focus-visible:ring-[3px] focus-visible:ring-ring/35",
              compact ? "justify-center p-3" : "p-3",
              active && "border-primary/30 bg-primary/12 text-primary",
              locked && "opacity-65"
            )}
          >
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary", active && "bg-primary text-primary-foreground")}>
              {locked ? <LockKeyhole size={17} aria-hidden /> : <Icon size={18} aria-hidden />}
            </span>
            {!compact ? <span className="min-w-0 flex-1 truncate">{label}</span> : <span className="pointer-events-none absolute right-full z-50 mr-2 hidden whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-xs text-background shadow-lg group-hover:block group-focus:block">{label}</span>}
          </Link>
        );
      })}
    </div>
  );
}

function AllModulesDialog({ open, onClose, subscriptionActive, title }: { open: boolean; onClose: () => void; subscriptionActive: boolean; title: string }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[90]" role="presentation">
    <button type="button" onClick={onClose} className="absolute inset-0 cursor-default bg-black/35 backdrop-blur-[2px]" aria-label="Close navigation" />
    <section role="dialog" aria-modal="true" aria-label={title} className="absolute inset-x-3 top-[max(4rem,env(safe-area-inset-top))] mx-auto max-h-[calc(100dvh-6rem)] w-auto max-w-4xl overflow-hidden rounded-[28px] border bg-card shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 sm:inset-x-auto sm:left-1/2 sm:w-[min(920px,calc(100vw-2rem))] sm:-translate-x-1/2">
      <header className="flex items-center justify-between border-b px-5 py-4"><h2 className="text-xl font-black text-primary">{title}</h2><button ref={close} type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/35" aria-label="Close"><X size={20} /></button></header>
      <NavigationList onNavigate={onClose} subscriptionActive={subscriptionActive} className="grid max-h-[calc(100dvh-11rem)] grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2" />
    </section>
  </div>;
}

function GridNavigation({ subscriptionActive }: Pick<Props, "subscriptionActive">) {
  const { t } = useT();
  const pathname = usePathname();
  const groups = useMemo(() => {
    const all = getNavigationItems();
    return Object.keys(NAVIGATION_GROUP_LABELS).map((group) => ({ group, items: all.filter((item) => item.group === group) })).filter((entry) => entry.items.length);
  }, []);
  return <aside aria-label={t("nav.mainMenu")} className="hidden h-full w-[290px] shrink-0 border-l bg-card md:block">
    <div className="border-b px-4 py-4"><div className="flex items-center gap-2 text-primary"><LayoutGrid size={19} /><span className="font-black">{t("nav.mainMenu")}</span></div></div>
    <nav className="h-[calc(100%-61px)] overflow-y-auto p-3">
      {groups.map(({ group, items }) => <section key={group} className="mb-4"><h2 className="mb-2 px-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t(NAVIGATION_GROUP_LABELS[group as keyof typeof NAVIGATION_GROUP_LABELS])}</h2><div className="grid grid-cols-2 gap-2">{items.map((item) => { const Icon = item.icon; const active = isNavigationActive(pathname, item.href); const locked = !subscriptionActive && isSubscriptionProtectedHref(item.href); return <Link key={item.id} href={locked ? "/dashboard/payment-online" : item.href} title={t(item.labelKey)} aria-current={active ? "page" : undefined} className={cn("flex min-h-[94px] flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center text-xs font-bold transition hover:border-primary/35 hover:bg-primary/5 focus-visible:ring-[3px] focus-visible:ring-ring/35", active && "border-primary bg-primary/10 text-primary", locked && "opacity-65")}><span className="text-primary">{locked ? <LockKeyhole size={20} /> : <Icon size={21} />}</span><span className="line-clamp-2">{t(item.labelKey)}</span></Link>; })}</div></section>)}
    </nav>
  </aside>;
}

export default function NavigationPresenter({ style, subscriptionActive }: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [allModulesOpen, setAllModulesOpen] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const primary = getNavigationItems().slice(0, 4);
  const pathname = usePathname();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setAllModulesOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  if (style === "GRID") return <><GridNavigation subscriptionActive={subscriptionActive} /><button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-30 rounded-full bg-primary p-3 text-primary-foreground shadow-lg md:hidden" aria-label={t("nav.mainMenu")}><LayoutGrid size={20} /></button><AllModulesDialog open={open} onClose={() => setOpen(false)} subscriptionActive={subscriptionActive} title={t("nav.mainMenu")} /></>;
  if (style === "RECTANGULAR") return <aside aria-label={t("nav.mainMenu")} className="hidden h-full w-[76px] shrink-0 border-l bg-card p-2 md:block"><NavigationList compact subscriptionActive={subscriptionActive} className="h-full space-y-2 overflow-y-auto" /></aside>;
  if (style === "TAB_BAR") return <><button type="button" onClick={() => setTabHidden((value) => !value)} className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-4 z-50 rounded-full border bg-card p-2 shadow-lg focus-visible:ring-[3px] focus-visible:ring-ring/35" aria-label={tabHidden ? "Show navigation" : "Hide navigation"}><ChevronUp className={tabHidden ? "rotate-180" : ""} size={18} /></button><nav aria-label={t("nav.mainMenu")} className={cn("fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-3xl items-center justify-around rounded-2xl border bg-card/95 p-2 shadow-xl backdrop-blur transition-transform duration-300 motion-reduce:transition-none", tabHidden && "translate-y-[calc(100%+1.5rem)]")}><div className="flex min-w-0 flex-1 items-center justify-around gap-1">{primary.map((item) => { const Icon = item.icon; const active = isNavigationActive(pathname, item.href); return <Link key={item.id} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold", active && "bg-primary/10 text-primary")}><Icon size={18}/><span className="max-w-full truncate">{t(item.labelKey)}</span></Link>; })}<button type="button" onClick={() => setOpen(true)} className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold"><MoreHorizontal size={18}/><span>{t("common.all")}</span></button></div></nav><AllModulesDialog open={open} onClose={() => setOpen(false)} subscriptionActive={subscriptionActive} title={t("nav.mainMenu")} /></>;
  if (style === "THREE_DOTS") return <><button type="button" onClick={() => setOpen((value) => !value)} className="fixed right-4 top-20 z-50 rounded-2xl border bg-card p-3 shadow-lg focus-visible:ring-[3px] focus-visible:ring-ring/35" aria-expanded={open} aria-label={t("nav.mainMenu")}><CircleEllipsis size={21}/></button>{open ? <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}><nav onClick={(event) => event.stopPropagation()} aria-label={t("nav.mainMenu")} className="absolute right-4 top-32 max-h-[min(70dvh,620px)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border bg-card p-3 shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"><NavigationList onNavigate={() => setOpen(false)} subscriptionActive={subscriptionActive} className="space-y-1" /></nav></div> : null}</>;
  if (style === "SHEET") return <><button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-30 rounded-full bg-primary p-4 text-primary-foreground shadow-lg focus-visible:ring-[3px] focus-visible:ring-ring/35" aria-label={t("nav.mainMenu")}><Menu size={22}/></button>{open ? <div className="fixed inset-0 z-[80]"><button type="button" className="absolute inset-0 cursor-default bg-black/35" onClick={() => setOpen(false)} aria-label="Close navigation"/><nav aria-label={t("nav.mainMenu")} className="absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto rounded-t-[28px] border bg-card p-4 shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-bottom md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[360px] md:rounded-none md:rounded-l-[28px] md:motion-safe:slide-in-from-right"><header className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black text-primary">{t("nav.mainMenu")}</h2><button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-muted" aria-label="Close"><X size={20}/></button></header><NavigationList onNavigate={() => setOpen(false)} subscriptionActive={subscriptionActive} className="space-y-1" /></nav></div> : null}</>;
  if (style === "RUDDER") return <><div className="fixed bottom-6 right-6 z-50"><button type="button" onClick={() => setOpen((value) => !value)} className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/35" aria-expanded={open} aria-label={t("nav.mainMenu")}><ShipWheel size={25}/></button>{open ? <div className="absolute bottom-16 right-0 flex w-[260px] flex-wrap justify-end gap-2">{primary.map((item) => { const Icon = item.icon; return <Link key={item.id} href={item.href} onClick={() => setOpen(false)} title={t(item.labelKey)} className="flex size-12 items-center justify-center rounded-full border bg-card text-primary shadow-lg transition hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/35"><Icon size={19}/></Link>; })}<button type="button" onClick={() => { setOpen(false); setAllModulesOpen(true); }} className="flex size-12 items-center justify-center rounded-full border bg-card text-primary shadow-lg" aria-label={t("common.all")}><PanelRightOpen size={19}/></button></div> : null}</div><AllModulesDialog open={allModulesOpen} onClose={() => setAllModulesOpen(false)} subscriptionActive={subscriptionActive} title={t("nav.mainMenu")} /></>;
  if (style === "FAB") return <><div className="fixed bottom-6 right-6 z-50"><button type="button" onClick={() => setOpen((value) => !value)} className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/35" aria-expanded={open} aria-label={t("nav.mainMenu")}>{open ? <X size={24}/> : <Plus size={25}/>}</button>{open ? <div className="absolute bottom-16 right-0 flex w-60 flex-col items-end gap-2">{primary.map((item) => { const Icon = item.icon; return <Link key={item.id} href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-full border bg-card py-2 pr-3 pl-4 text-sm font-bold shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"><Icon size={18} className="text-primary"/>{t(item.labelKey)}</Link>; })}<button type="button" onClick={() => { setOpen(false); setAllModulesOpen(true); }} className="rounded-full border bg-card px-4 py-2 text-sm font-bold shadow-lg" aria-label={t("common.all")}>{t("common.all")}</button></div> : null}</div><AllModulesDialog open={allModulesOpen} onClose={() => setAllModulesOpen(false)} subscriptionActive={subscriptionActive} title={t("nav.mainMenu")} /></>;
  return null;
}
