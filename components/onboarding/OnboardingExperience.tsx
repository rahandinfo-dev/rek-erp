"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { CURRENT_ONBOARDING_VERSION } from "@/lib/onboarding/constants";

type StepId = "welcome" | "terms" | "privacy" | "guide";

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: "welcome", label: "بەخێربێیت" },
  { id: "terms", label: "مەرجەکان" },
  { id: "privacy", label: "تایبەتمەندی" },
  { id: "guide", label: "ڕێنمایی" },
];

export function OnboardingGuide() {
  const sections = [
    ["داشبۆرد", "کردنەوە: Side Menu ← داشبۆرد", "پوختەی دۆخی فرۆشتن، کۆگا و چاودێرییە گرنگەکان ببینە؛ کارتەکان بۆ بەشی پەیوەندیدار بکەرەوە."],
    ["بەرهەم و پۆل", "کردنەوە: Side Menu ← بەرهەم", "بەرهەم، پۆل، یەکە و بارکۆد زیاد بکە. پێش دروستکردنی پسوولە، نرخ و یەکەی دروست دڵنیابکەوە."],
    ["کۆگا و مخزون", "کردنەوە: Side Menu ← کۆگا / مخزون", "بڕی بەردەست بزانە، گواستنەوە و ڕێکخستن تۆمار بکە و مێژووی جوڵەکان بپشکنە."],
    ["فرۆشتن و پسوولە", "کردنەوە: Side Menu ← فرۆشتن", "کڕیار هەڵبژێرە، بەرهەمەکان زیاد بکە، پسوولە پاشەکەوت یان چاپ بکە و پارەدانەکەی تۆمار بکە."],
    ["کڕین", "کردنەوە: Side Menu ← کڕین", "دابینکەر و کاڵاکان دیاری بکە؛ بەشە کڕاوەکان بۆ کۆگا و تۆمارە داراییەکان بەکاربهێنە."],
    ["کڕیار و دابینکەر", "کردنەوە: Side Menu ← کڕیاران / دابینکەران", "پڕۆفایل، ژمارەی پەیوەندی، باڵانس و مێژووی مامەڵەی هەر لایەنێک ببینە."],
    ["پارەدان و قەرز", "کردنەوە: Side Menu ← پارەدان / قەرز", "وەرگرتن و دانان تۆمار بکە؛ بڕی ماوە و کاتی پارەدان بە وردی پشکنە."],
    ["کارمەند و مووچە", "کردنەوە: Side Menu ← کارمەندان", "زانیاری کارمەند، ئامادەبوون و تۆمارە پەیوەندیدارەکان بە دەسەڵاتی خۆت بەڕێوەببە."],
    ["ڕاپۆرت و شیکاری", "کردنەوە: Side Menu ← ڕاپۆرتەکان / شیکاری", "ماوەی بەروار و فلتەر دیاری بکە، داتا بەراورد بکە و تەنها ڕاپۆرتی گونجاو هەناردە بکە."],
    ["چالاکی و ئاگادارکردنەوە", "کردنەوە: Side Menu ← مێژووی چالاکییەکان / ئاگادارکردنەوە", "کێ چی گۆڕیوە و ئاگادارکردنەوە نوێیەکان ببینە؛ ئەم بەشە بۆ چاودێرییە، نەک دەستکارییە."],
    ["ڕەشنووس، گەڕاندنەوە و سەبەتە", "کردنەوە: Side Menu ← ڕەشنووسەکان / گەڕاندنەوە / سەبەتە", "کارە ناتەواوەکان بەردەوام بکە. سڕینەوەی ئاسایی تەنها دەخرێتە سەبەتە؛ بەتاڵکردنەوەی سەبەتە هەمیشەییە و پشتڕاستکردنەوەی داواکراوە."],
    ["ڕێکخستن و هەژمار", "کردنەوە: Side Menu ← ڕێکخستن", "پڕۆفایلی کۆمپانیا، زانیاری بەکارهێنەر، وشەی نهێنی، ئاگادارکردنەوە و پاشەکەوتی خۆکار لە شوێنی پەیوەندیدار ڕێکبخە."],
    ["بەشداربوون و یارمەتی", "کردنەوە: Side Menu ← داواکردنی سیستەمی REK / ڕێنمایی", "دۆخی بەشداربوون ببینە و بۆ پشتیوانی لە ڕێگای پەیوەندییە فەرمییەکان بەکاربهێنە."],
  ] as const;

  return (
    <section aria-labelledby="onboarding-guide-title" className="space-y-3">
      <h2 id="onboarding-guide-title" className="text-lg font-black text-foreground">
        ڕێنمایی بەکارهێنانی سیستەم
      </h2>
      <p className="text-sm leading-7 text-muted-foreground">
        REK ERP بۆ بەڕێوەبردنی کارە سەرەکییەکانی کۆمپانیاکەت ڕێکخراوە.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map(([title, open, steps]) => (
          <article key={title} className="border border-border bg-card p-4">
            <h3 className="font-black text-foreground">{title}</h3>
            <p className="mt-2 text-xs font-bold text-primary">{open}</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{steps}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PolicyPlaceholder({ kind }: { kind: "terms" | "privacy" }) {
  const isTerms = kind === "terms";
  return (
    <section className="border border-border bg-muted px-4 py-4 sm:px-5" aria-labelledby={`onboarding-${kind}-placeholder`}>
      <div className="flex items-start gap-3">
        {isTerms ? <BookOpen className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden /> : <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden />}
        <div>
          <h2 id={`onboarding-${kind}-placeholder`} className="font-black text-foreground">
            شوێنی ناوەڕۆکی فەرمی
          </h2>
          <p className="mt-1 text-sm leading-7 text-muted-foreground">
            {isTerms
              ? "ناوەڕۆکی فەرمی مەرج و یاساکانی REK ERP لە ئێستا دا لە سیستەمدا بەردەست نییە. خاوەن سیستەم دەتوانێت دەقی پەسەندکراو لێرە دابنێت."
              : "ڕەوشتی فەرمی پاراستنی زانیاری و تایبەتمەندی لە ئێستا دا لە سیستەمدا بەردەست نییە. خاوەن سیستەم دەتوانێت دەقی پەسەندکراو لێرە دابنێت."}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function OnboardingExperience({ userName }: { userName: string }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  async function accept() {
    if (!accepted || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true, version: CURRENT_ONBOARDING_VERSION }),
      });
      if (!response.ok) {
        setError("پەسەندکردن سەرکەوتوو نەبوو. تکایە دووبارە هەوڵ بدە.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("پەیوەندی بە ڕاژەکارەوە سەرکەوتوو نەبوو. تکایە دووبارە هەوڵ بدە.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main dir="rtl" lang="ckb" className="flex min-h-dvh bg-background px-4 py-[max(1rem,env(safe-area-inset-top))] text-foreground sm:px-6 sm:py-8">
      <section className="m-auto grid w-full max-w-4xl overflow-hidden border border-border bg-card md:grid-cols-[minmax(13rem,0.7fr)_minmax(0,1.4fr)]">
        <aside className="border-b border-border bg-sidebar p-5 text-sidebar-foreground md:border-b-0 md:border-l md:p-7">
          <Image src={BRAND.logoOnNavy} alt="REK apps" width={180} height={180} priority className="h-auto w-24 object-contain" />
          <p className="mt-5 text-xs font-bold tracking-[0.16em] text-sidebar-muted" dir="ltr">REK ERP</p>
          <h1 className="mt-2 text-xl font-black leading-8">بەخێربێیت، {userName}</h1>
          <ol className="mt-7 grid gap-2" aria-label="هەنگاوەکانی دەستپێک">
            {STEPS.map((item, index) => {
              const active = index === stepIndex;
              const completed = index < stepIndex;
              return <li key={item.id} className="flex items-center gap-3 text-sm"><span className="flex size-6 shrink-0 items-center justify-center border border-sidebar-border text-xs font-black">{completed ? <Check size={15} aria-hidden /> : index + 1}</span><span className={active ? "font-black text-sidebar-foreground" : "text-sidebar-muted"}>{item.label}</span></li>;
            })}
          </ol>
        </aside>

        <div className="flex min-h-[30rem] min-w-0 flex-col p-5 sm:p-7 md:p-9">
          <div key={step.id} className="min-h-0 flex-1 overflow-y-auto motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-1 motion-safe:duration-200">
            {step.id === "welcome" ? <section aria-labelledby="welcome-title"><p className="text-sm font-bold text-primary">REK ERP</p><h2 id="welcome-title" className="mt-2 text-2xl font-black sm:text-3xl">بەخێربێیت بۆ REK ERP</h2><p className="mt-4 max-w-2xl text-sm leading-8 text-muted-foreground">REK ERP سیستەمێکی بەڕێوەبردنی کارە. ئەم زانیارییە کورته‌یە یارمەتیت دەدات بۆ ناسینی بەکارهێنان، تایبەتمەندی و ڕێساکانی سیستەم.</p></section> : null}
            {step.id === "terms" ? <section aria-labelledby="terms-title"><h2 id="terms-title" className="text-2xl font-black sm:text-3xl">مەرج و یاساکانی بەکارهێنان</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">تکایە ناوەڕۆکی فەرمییەکە بخوێنەوە کاتێک خاوەن سیستەم دابینی دەکات.</p><div className="mt-5"><PolicyPlaceholder kind="terms" /></div></section> : null}
            {step.id === "privacy" ? <section aria-labelledby="privacy-title"><h2 id="privacy-title" className="text-2xl font-black sm:text-3xl">پاراستنی زانیاری و تایبەتمەندی</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">ئەم بەشە شوێنی ڕەوشتی فەرمی پاراستنی زانیارییە.</p><div className="mt-5"><PolicyPlaceholder kind="privacy" /></div></section> : null}
            {step.id === "guide" ? <OnboardingGuide /> : null}
          </div>

          {isLastStep ? <div className="mt-6 border-t border-border pt-5"><label className="flex cursor-pointer items-start gap-3 text-sm font-bold leading-7"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 size-4 shrink-0 accent-primary" /><span>مەرج و یاساکانی بەکارهێنانی REK ERPم خوێندەوە و قبووڵیان دەکەم.</span></label>{error ? <p role="alert" className="mt-3 text-sm font-bold text-destructive">{error}</p> : null}<button type="button" onClick={accept} disabled={!accepted || submitting} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-60"><LockKeyhole size={17} aria-hidden />{submitting ? "تکایە چاوەڕێبە…" : "قبووڵ دەکەم و بەردەوام دەبم"}</button></div> : <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5"><button type="button" onClick={() => setStepIndex((value) => Math.max(0, value - 1))} disabled={stepIndex === 0} className="inline-flex min-h-11 items-center gap-2 border border-border bg-card px-4 text-sm font-bold focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:opacity-50"><ArrowRight size={17} aria-hidden />پێشوو</button><button type="button" onClick={() => setStepIndex((value) => Math.min(STEPS.length - 1, value + 1))} className="inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm font-black text-primary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35">بەردەوام بە<ArrowLeft size={17} aria-hidden /></button></div>}
        </div>
      </section>
    </main>
  );
}
