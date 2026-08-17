"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Clipboard, Clock3, CreditCard, LoaderCircle, MessageCircle, QrCode, Send, ShieldCheck } from "lucide-react";
import { useConfirmation } from "@/components/ui/ConfirmationProvider";
import { PAYMENT_ACCOUNT_NUMBER, PAYMENT_CONTACTS, PAYMENT_QR_IMAGES } from "@/lib/subscriptions/config";
import type { SubscriptionPlanPrice } from "@/lib/subscriptions/pricing";

type Entitlement = { active: boolean; status: string; plan: string | null; activatedAt: string | null; expiresAt: string | null; remainingDays: number | null; remainingSeconds: number | null; serverNow: string; expiresSoon: boolean };
type Pricing = { exchangeRateIqdPerUsd: number; plans: SubscriptionPlanPrice[] };
type SubscriptionHistory = { id: string; type: string; actionSource: string; plan: string | null; status: string | null; activatedAt: string | null; expiresAt: string | null; finalizedAt: string | null; createdAt: string; durationDays: number | null; bonusDays: number; codeFingerprint: string | null; licenseCode: { codeHash: string } | null };
type Provider = { id: "fib" | "fastPay" | "superQi"; name: string; qr: string; color: string; tint: string; textColor: string };

const planLabel: Record<string, string> = { ONE_MONTH: "١ مانگ", THREE_MONTHS: "٣ مانگ", ONE_YEAR: "١ ساڵ", LIFETIME: "هەمیشەیی" };
const statusLabel: Record<string, string> = { ACTIVE: "چالاک", EXPIRED: "بەسەرچوو", REVOKED: "وەستێندرا", CANCELLED: "هەڵوەشێندراوەتەوە", SUSPENDED: "ئەم پلانە لەلایەن ئەدمینەوە وەستێنراوە.", NONE: "ناچالاک" };
const providers: Provider[] = [
  { id: "fib", name: "FIB", qr: PAYMENT_QR_IMAGES.fib, color: "#119b87", tint: "#e7f8f4", textColor: "#087466" },
  { id: "fastPay", name: "FastPay", qr: PAYMENT_QR_IMAGES.fastPay, color: "#e63363", tint: "#fff0f4", textColor: "#bd1e4a" },
  { id: "superQi", name: "Super Qi", qr: PAYMENT_QR_IMAGES.superQi, color: "#d9ab00", tint: "#fff9dd", textColor: "#806400" },
];
const formatIqd = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
const formatCountdown = (seconds: number | null) => {
  if (seconds === null) return "هەمیشەیی";
  const days = Math.floor(seconds / 86_400); const hours = Math.floor((seconds % 86_400) / 3_600); const minutes = Math.floor((seconds % 3_600) / 60); const remainder = seconds % 60;
  return `${days} ڕۆژ، ${hours} کاتژمێر، ${minutes} خولەک، ${remainder} چرکە`;
};
const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(value)) : "—";

function ProviderCard({ provider, selected, onSelect }: { provider: Provider; selected: boolean; onSelect: () => void }) {
  const [imageAvailable, setImageAvailable] = useState(true);
  const [copied, setCopied] = useState(false);
  async function copy() { try { await navigator.clipboard.writeText(PAYMENT_ACCOUNT_NUMBER); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { /* Clipboard may be unavailable in a restricted browser context. */ } }
  return <article className="flex h-full flex-col overflow-hidden rounded-3xl border-2 bg-card shadow-sm transition" style={{ borderColor: selected ? provider.color : `${provider.color}55`, boxShadow: selected ? `0 14px 30px ${provider.color}22` : undefined }}>
    <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: provider.tint, color: provider.textColor }}><CreditCard size={20} aria-hidden /><h3 className="text-lg font-black">{provider.name}</h3></div>
    <div className="flex flex-1 flex-col gap-4 p-5">
      {imageAvailable ? <Image src={provider.qr} alt={`${provider.name} payment QR`} width={720} height={720} sizes="(min-width: 768px) 32vw, 92vw" unoptimized className="mx-auto aspect-square w-full max-w-[420px] rounded-2xl border-2 bg-white object-contain p-2" style={{ borderColor: `${provider.color}66` }} onError={() => setImageAvailable(false)} /> : <div className="mx-auto flex aspect-square w-full max-w-[420px] flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/40 p-5 text-center text-xs text-muted-foreground" style={{ borderColor: `${provider.color}66` }}><QrCode size={42} className="mb-3" style={{ color: provider.textColor }} aria-hidden />QRی ڕاستەقینەی {provider.name} لە ڕێکخستنەکانی پارەدان دابنێ.</div>}
      <div className="rounded-2xl border p-3 text-center" style={{ borderColor: `${provider.color}55`, backgroundColor: provider.tint }}><p className="text-xs font-bold" style={{ color: provider.textColor }}>ژمارەی هەژمار</p><p dir="ltr" className="mt-1 font-mono text-lg font-black tracking-wide" style={{ color: provider.textColor }}>{PAYMENT_ACCOUNT_NUMBER}</p></div>
      <button type="button" onClick={() => void copy()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-black transition hover:bg-muted" style={{ borderColor: `${provider.color}55`, color: provider.textColor }}><Clipboard size={16} aria-hidden />{copied ? "کۆپیکرا" : "کۆپی ژمارەی هەژمار"}</button>
      <button type="button" onClick={onSelect} aria-pressed={selected} className="flex min-h-11 w-full items-center justify-center rounded-2xl px-4 text-sm font-black text-white transition hover:opacity-90" style={{ backgroundColor: provider.color }}>{selected ? `${provider.name} هەڵبژێردرا` : `پارەدان بە ${provider.name}`}</button>
      <p className="mt-auto text-center text-xs leading-6 text-muted-foreground">تەنها دوای پشتڕاستکردنەوەی پارەدان کۆدی چالاکسازی وەردەگریت، لە ڕێگەیی ژمارەی هەژمارەکەم پارە بنێرە دواتر لە Telegram یان WhatsApp نامە بنێرە بە کەمتر
لە 1 کاتژمێر وەڵامت دەدرێتەوە و کۆدی چالاکسازی پلانی بەشداریکردنت پێ دەدرێت لەلایەن تیمەکەمان</p>
    </div>
  </article>;
}

export default function PaymentOnlineClient({ initialEntitlement, history, pricing, pageTitle }: { initialEntitlement: Entitlement; history: SubscriptionHistory[]; pricing: Pricing; pageTitle: string }) {
  const router = useRouter();
  const confirmAction = useConfirmation();
  const paymentMethodsRef = useRef<HTMLElement>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanPrice | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider["id"] | null>(null);
  const [cancellationConfirmation, setCancellationConfirmation] = useState("");
  const [cancellationPassword, setCancellationPassword] = useState("");
  const [clock, setClock] = useState(() => new Date(initialEntitlement.serverNow).getTime());
  const currentPlanPrice = initialEntitlement.plan ? pricing.plans.find((plan) => plan.plan === initialEntitlement.plan) : null;

  useEffect(() => {
    const serverNow = new Date(initialEntitlement.serverNow).getTime(); const clientStartedAt = Date.now();
    const id = window.setInterval(() => setClock(serverNow + Date.now() - clientStartedAt), 1_000);
    return () => window.clearInterval(id);
  }, [initialEntitlement.serverNow]);

  const remainingSeconds = initialEntitlement.expiresAt ? Math.max(0, Math.floor((new Date(initialEntitlement.expiresAt).getTime() - clock) / 1_000)) : null;

  async function activate(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(null);
    try { const res = await fetch("/api/subscription/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }); const body = await res.json(); if (!res.ok) throw new Error(body.message || "چالاکسازی سەرنەکەوت."); setMessage(body.idempotent ? "کۆدەکە پێشتر چالاک کراوە." : "بەشداربوونت بە سەرکەوتوویی چالاککرا."); setCode(""); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "چالاکسازی سەرنەکەوت."); } finally { setBusy(false); }
  }
  function selectPlan(plan: SubscriptionPlanPrice) {
    setSelectedPlan(plan);
    window.requestAnimationFrame(() => paymentMethodsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  async function cancelSubscription() {
    if (!cancellationConfirmation.trim() && !cancellationPassword) { setMessage("بۆ هەڵوەشاندنەوەی بەشداریکردن وشەی «CONFIRM» یان «ڕازیم» یان «وشەی نهێنی هەژمارەکەت» بنووسە"); return; }
    const confirmed = await confirmAction({ title: "هەڵوەشاندنەوەی بەشداربوون", description: "دڵنیایت؟ دەستگەیشتن بە بەشە پارێزراوەکان یەکسەر داخراو دەبێت، بەڵام هیچ داتایەکی کۆمپانیا ناسڕێتەوە.", confirmText: "هەڵوەشاندنەوە" });
    if (!confirmed) return;
    setBusy(true); setMessage(null);
    try { const res = await fetch("/api/subscription/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: cancellationConfirmation.trim() || undefined, password: cancellationPassword || undefined }) }); const body = await res.json(); if (!res.ok) throw new Error(body.message || "هەڵوەشاندنەوە سەرنەکەوت."); setMessage("بەشداربوون هەڵوەشێندرایەوە؛ هەموو داتاکانت پارێزراون."); setCancellationConfirmation(""); setCancellationPassword(""); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "هەڵوەشاندنەوە سەرنەکەوت."); }
    finally { setBusy(false); }
  }
  const selectedProviderName = providers.find((provider) => provider.id === selectedProvider)?.name;

  return <div className="mx-auto max-w-6xl space-y-6 pb-8" dir="rtl">
    <section className="overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-bl from-primary/15 via-card to-card p-6 shadow-[0_20px_60px_var(--shadow-brand)] sm:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-black text-primary"><ShieldCheck size={15} aria-hidden /> REK ERP Subscription</div><h1 className="mt-4 text-3xl font-black text-foreground sm:text-4xl">{pageTitle}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">بۆ چالاککردن یان نوێکردنەوەی بەشداربوون، پلان هەڵبژێرە و پارەدان بە یەکێک لە ڕێگاکانی خوارەوە ئەنجام بدە. چالاکسازی تەنها بە کۆدی دەرچوو دوای پشتڕاستکردنەوەی پارەدان دەبێت.</p><p className="mt-3 inline-flex rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-black text-primary">بۆ پارەدانی بەشداری، هەمیشە $100 = 138,000 IQD حیساب دەکرێت.</p></div><div className={`rounded-2xl border px-5 py-4 ${initialEntitlement.active ? "border-emerald-500/25 bg-emerald-500/10" : "border-amber-500/25 bg-amber-500/10"}`}><p className="text-xs text-muted-foreground">دۆخی بەشداربوون</p><p className="mt-1 text-lg font-black">{statusLabel[initialEntitlement.status] || initialEntitlement.status}</p></div></div></section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-3xl border bg-card p-5"><p className="text-xs text-muted-foreground">پلانی ئێستا</p><p className="mt-2 font-black">{initialEntitlement.plan ? planLabel[initialEntitlement.plan] : "—"}</p>{currentPlanPrice ? <p dir="ltr" className="mt-1 text-xs text-muted-foreground">${currentPlanPrice.usd.toFixed(2)}</p> : null}</div><div className="rounded-3xl border bg-card p-5"><p className="text-xs text-muted-foreground">بەرواری چالاکسازی</p><p dir="ltr" className="mt-2 font-bold">{date(initialEntitlement.activatedAt)}</p></div><div className="rounded-3xl border bg-card p-5"><p className="text-xs text-muted-foreground">بەرواری بەسەرچوون</p><p dir="ltr" className="mt-2 font-bold">{initialEntitlement.expiresAt ? new Date(initialEntitlement.expiresAt).toLocaleString() : "∞"}</p></div><div className="rounded-3xl border bg-card p-5"><p className="text-xs text-muted-foreground">ڕۆژە ماوەکان</p><p className="mt-2 flex items-center gap-2 font-black"><Clock3 size={17} aria-hidden />{formatCountdown(remainingSeconds)}</p></div></section>

    <form onSubmit={activate} className="rounded-3xl border border-primary/20 bg-card p-5 sm:p-6"><div className="flex flex-col gap-3 md:flex-row md:items-end"><label className="min-w-0 flex-1"><span className="mb-2 block text-sm font-black">کۆدی چالاکسازی</span><input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" placeholder="XXXXX-XXXXX-XXXXX" className="h-12 w-full rounded-2xl border border-border bg-background px-4 font-mono text-sm uppercase outline-none focus:border-primary/60" /></label><button disabled={busy || !code.trim()} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-black text-primary-foreground disabled:opacity-60">{busy ? <LoaderCircle size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}{busy ? "چالاکدەکرێت…" : "چالاککردن"}</button></div>{message ? <p role="status" className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm">{message}</p> : null}{initialEntitlement.active ? <div className="mt-4 border-t pt-4"><p className="text-xs text-muted-foreground">هەڵوەشاندنەوە یەکسەر بەشە دەستگەیشتووەکان داخراو دەکات، وە هیچ داتایەکی کۆمپانیاکەت ناسڕیتەوە و جێگئر دەبێت مێژووی پلانەکەت دەمێنێت بۆ هەمیشە.</p><div className="mt-3 grid max-w-lg gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-bold">بۆ هەڵوەشاندنەوە «CONFIRM» یان «ڕازیم»</span><input value={cancellationConfirmation} onChange={(event) => setCancellationConfirmation(event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm" autoComplete="off" /></label><label><span className="mb-1 block text-xs font-bold">یان «وشەی نهێنی هەژمارەکەت» بنووسە</span><input type="password" value={cancellationPassword} onChange={(event) => setCancellationPassword(event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm" autoComplete="current-password" /></label></div><button type="button" disabled={busy} onClick={() => void cancelSubscription()} className="mt-2 rounded-xl border border-destructive/40 px-3 py-2 text-sm font-black text-destructive hover:bg-destructive/10 disabled:opacity-60">هەڵوەشاندنەوەی بەشداریکردنی پلانەکەت</button></div> : null}</form>

    <section aria-labelledby="plans-heading"><div className="mb-4"><h2 id="plans-heading" className="text-2xl font-black">پلانەکانی بەشداربوون</h2><p className="mt-1 text-sm text-muted-foreground">نرخ و گۆڕینی IQD لە یەک سەرچاوەی ڕێکخراوەوە دێت. $1 = 1,380 IQD.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{pricing.plans.map((plan) => { const selected = selectedPlan?.plan === plan.plan; return <article key={plan.plan} className={`rounded-3xl border-2 bg-card p-5 transition ${selected ? "border-primary bg-primary/5 shadow-[0_12px_30px_var(--shadow-brand)]" : "border-border"}`}><p className="text-lg font-black">{planLabel[plan.plan]}</p><p dir="ltr" className="mt-3 text-3xl font-black">${plan.usd.toFixed(2)}</p><p className="mt-1 text-sm font-bold text-primary">{formatIqd(plan.iqd)} IQD</p><p className="mt-2 text-xs text-muted-foreground">{plan.totalDays ? `ماوەی کارا: ${plan.totalDays} ڕۆژ` : "ماوە: هەمیشەیی"}</p>{plan.bonusDays ? <p className="mt-1 text-xs font-black text-emerald-700 dark:text-emerald-300">{plan.baseDays} ڕۆژ + {plan.bonusDays} ڕۆژی دیاری/بەخشیش</p> : plan.baseDays ? <p className="mt-1 text-xs text-muted-foreground">{plan.baseDays} ڕۆژ</p> : null}<button type="button" onClick={() => selectPlan(plan)} aria-pressed={selected} className={`mt-5 min-h-11 w-full rounded-2xl px-4 text-sm font-black transition ${selected ? "bg-primary text-primary-foreground" : "border border-primary/30 text-primary hover:bg-primary/10"}`}>{selected ? "پلان هەڵبژێردرا" : "بەشداربوون"}</button></article>; })}</div></section>

    {selectedPlan ? <section aria-live="polite" className="rounded-2xl border border-primary/25 bg-primary/10 px-5 py-4 text-sm leading-7"><p className="font-black">پلانی {planLabel[selectedPlan.plan]}ت هەڵبژاردووە.</p><p>بڕی <span dir="ltr" className="font-black">${selectedPlan.usd.toFixed(2)}</span> ـە.</p><p>بە دیناری عێراقی: <span dir="ltr" className="font-black">{formatIqd(selectedPlan.iqd)} IQD</span> <span className="text-xs text-muted-foreground">(نرخێکی ڕێکخراو/جێگیر بە هەمیشەیی)</span>.</p><p>تکایە بڕە پارەکە بە یەکێک لە FastPay یان FIB یان Super Qi بنێرە <span dir="ltr" className="font-black">{PAYMENT_ACCOUNT_NUMBER}</span>. ڕێگای پارەدان بە ئارەزووی خۆتە{selectedProviderName ? `؛ ${selectedProviderName} هەڵبژێردراوە` : ""}.</p></section> : null}

    <section ref={paymentMethodsRef} aria-labelledby="payment-methods-heading" className="scroll-mt-6"><div className="mb-4"><h2 id="payment-methods-heading" className="text-2xl font-black">ڕێگاکانی پارەدان</h2><p className="mt-1 text-sm text-muted-foreground">هەڵبژاردنی پلان یان ڕێگای پارەدان</p></div><div className="grid gap-5 md:grid-cols-3">{providers.map((provider) => <ProviderCard key={provider.id} provider={provider} selected={selectedProvider === provider.id} onSelect={() => setSelectedProvider(provider.id)} />)}</div></section>

    <section className="rounded-3xl border bg-card p-5"><h2 className="text-lg font-black">مێژووی پلانەکان</h2><p className="mt-1 text-sm text-muted-foreground">ئەم تۆمارانە هەمیشە پارێزراون، تەنانەت دوای بەسەرچوون یان هەڵوەشاندنەوە.</p><div className="mt-4 space-y-3">{history.length ? history.map((event) => <article key={event.id} className="rounded-2xl border bg-background p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{event.plan ? planLabel[event.plan] || event.plan : "—"}</b><span className="rounded-full bg-muted px-2 py-1 text-xs font-black">{event.status || event.type}</span></div><p className="mt-2 text-xs text-muted-foreground">{event.durationDays ? `${event.durationDays} ڕۆژ${event.bonusDays ? ` (${event.bonusDays} ڕۆژی بۆنەس)` : ""}` : "هەمیشەیی"} · {event.actionSource}</p><p dir="ltr" className="mt-1 text-xs text-muted-foreground">{event.activatedAt ? new Date(event.activatedAt).toLocaleString() : "—"} → {event.expiresAt ? new Date(event.expiresAt).toLocaleString() : "∞"}</p><p dir="ltr" className="mt-1 text-xs text-muted-foreground">Code: {event.codeFingerprint || event.licenseCode?.codeHash.slice(0, 16) || "—"}</p></article>) : <p className="text-sm text-muted-foreground">هێشتا هیچ مێژوویەکی پلان نییە.</p>}</div></section>
    <section className="grid gap-4 md:grid-cols-2"><a href={PAYMENT_CONTACTS.whatsappUrl} target="_blank" rel="noreferrer" className="flex min-h-20 items-center justify-between rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-5 transition hover:bg-emerald-500/15"><span><span className="block text-lg font-black">WhatsApp</span><span dir="ltr" className="mt-1 block text-sm text-muted-foreground">{PAYMENT_CONTACTS.whatsappNumber}</span></span><MessageCircle className="text-emerald-600" size={26} aria-hidden /></a><a href={PAYMENT_CONTACTS.telegramUrl} target="_blank" rel="noreferrer" className="flex min-h-20 items-center justify-between rounded-3xl border border-sky-500/25 bg-sky-500/10 p-5 transition hover:bg-sky-500/15"><span><span className="block text-lg font-black">Telegram</span><span dir="ltr" className="mt-1 block text-sm text-muted-foreground">{PAYMENT_CONTACTS.telegramUsername}</span></span><Send className="text-sky-600" size={26} aria-hidden /></a></section>
  </div>;
}
