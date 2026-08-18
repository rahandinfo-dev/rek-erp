import Link from "next/link";
import { Bell, Building2, FileText, History, ImageIcon, KeyRound, LayoutGrid, Save, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { tServer } from "@/lib/i18n";

const SETTINGS_SECTIONS = [
  { href: "/dashboard/settings/company", label: "پڕۆفایلی کۆمپانیا", icon: Building2 },
  { href: "/dashboard/settings/company", label: "وێنەی کۆمپانیا", icon: ImageIcon },
  { href: "/dashboard/settings/templates", label: "قالبی پسووڵە", icon: FileText },
  { href: "/dashboard/settings/user", label: "زانیاری بەکارهێنەر", icon: UserRound },
  { href: "/dashboard/settings/user", label: "وێنەی بەکارهێنەر", icon: ImageIcon },
  { href: "/dashboard/settings/auto-save", label: "پاشەکەوتی خۆکار", icon: Save },
  { href: "/dashboard/settings/notifications", label: "ڕێکخستنی ئاگادارکردنەوە", icon: Bell },
  { href: "/dashboard/settings/password", label: "گۆڕینی وشەی نهێنی", icon: KeyRound },
  { href: "/dashboard/settings/versions", label: "مێژووی وەشان", icon: History },
  { href: "/dashboard/settings/navigation-style", label: "ڕێکخستنی ستایلی سیستەم", icon: LayoutGrid },
] as const;

export default async function SettingsPage() {
  if (!(await getCurrentUser())) return null;
  const t = tServer.t;
  return (
    <div className="mx-auto max-w-6xl space-y-6" dir="rtl">
      <header>
        <h1 className="text-3xl font-black text-primary sm:text-4xl">{t("nav.settingsFull")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">بەشێک هەڵبژێرە بۆ بینین و پاشەکەوتکردنی ڕێکخستنەکان.</p>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="ڕێکخستنەکان">
        {SETTINGS_SECTIONS.map((item, index) => { const Icon = item.icon; return <Link key={`${item.href}-${index}`} href={item.href} className="rounded-2xl border bg-card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-[3px] focus-visible:ring-ring/35"><span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon size={21} /></span><p className="mt-4 font-black">{item.label}</p></Link>; })}
      </section>
    </div>
  );
}
