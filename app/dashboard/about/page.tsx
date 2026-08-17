import { Mail, MapPin, Phone } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { REK_PROFILE } from "@/lib/about/rek-profile";
import { BRAND } from "@/lib/brand";
import { tServer } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function AboutPage() {
  if (!(await getCurrentUser())) return null;
  const t = tServer.t;

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-8" dir="rtl">
      <PageHeader
        title={t("nav.aboutUs")}
        description={REK_PROFILE.hero.description}
        breadcrumb={[{ label: t("nav.home"), href: "/dashboard" }, { label: t("nav.aboutUs") }]}
      />

      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-bl from-primary/15 via-card to-card p-6 sm:p-8">
        <p className="text-xs font-black tracking-[0.18em] text-primary">{REK_PROFILE.hero.eyebrow}</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl"><h2 className="text-3xl font-black sm:text-4xl">{REK_PROFILE.hero.title}</h2><p className="mt-3 text-sm leading-8 text-muted-foreground sm:text-base">{REK_PROFILE.hero.description}</p></div>
          <div className="rounded-2xl border border-primary/20 bg-card/70 px-4 py-3 text-left"><p dir="ltr" className="font-black text-primary">{BRAND.productName}</p><p className="mt-1 text-xs text-muted-foreground">{BRAND.taglineKu}</p></div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {REK_PROFILE.sections.map((section) => {
          const Icon = section.icon;
          return <article key={section.id} className="rounded-3xl border bg-card p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon size={21} aria-hidden /></span><div className="min-w-0"><h2 className="text-xl font-black">{section.title}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{section.description}</p>{section.items ? <ul className="mt-4 grid gap-2 text-sm text-foreground sm:grid-cols-2">{section.items.map((item) => <li key={item} className="rounded-xl bg-muted/60 px-3 py-2">{item}</li>)}</ul> : null}</div></div></article>;
        })}
      </section>

      <section className="rounded-3xl border bg-card p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MapPin size={21} aria-hidden /></span><div><h2 className="text-xl font-black">{REK_PROFILE.contact.title}</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{REK_PROFILE.contact.description}</p></div></div>{REK_PROFILE.contact.email || REK_PROFILE.contact.phone || REK_PROFILE.contact.socialLinks.length ? <div className="mt-5 flex flex-wrap gap-3">{REK_PROFILE.contact.email ? <a href={`mailto:${REK_PROFILE.contact.email}`} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><Mail size={16} />{REK_PROFILE.contact.email}</a> : null}{REK_PROFILE.contact.phone ? <a href={`tel:${REK_PROFILE.contact.phone}`} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><Phone size={16} />{REK_PROFILE.contact.phone}</a> : null}{REK_PROFILE.contact.socialLinks.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="rounded-xl border px-3 py-2 text-sm font-bold">{link.label}</a>)}</div> : null}</section>
    </main>
  );
}
