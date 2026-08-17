"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, Download, KeyRound, RefreshCw, ShieldBan, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Plan = "ONE_MONTH" | "THREE_MONTHS" | "ONE_YEAR" | "LIFETIME";
type License = { id: string; plan: Plan; status: string; companyId: string | null; activatedAt: string | Date | null; expiresAt: string | Date | null; usedAt: string | Date | null; createdAt: string | Date; company: { name: string; email: string } | null; usedByUser?: { fullName: string; email: string } | null; currentSubscription?: { id: string } | null; _count?: { lifecycleEvents: number } };
type AdminAlert = { id: string; kind: string; title: string; message: string; createdAt: string | Date };
type CodeCount = { plan: Plan; status: string; _count: { _all: number } };
type AdminHistory = { id: string; type: string; actionSource: string; plan: Plan | null; status: string | null; activatedAt: string | Date | null; expiresAt: string | Date | null; finalizedAt: string | Date | null; durationDays: number | null; bonusDays: number; codeFingerprint: string | null; reason: string | null; createdAt: string | Date; company: { name: string; email: string }; user: { fullName: string; email: string } | null };
type CompanyHistoryEvent = Omit<AdminHistory, "company" | "user">;
type CompanyProfile = { id: string; name: string; code: string | null; email: string; createdAt: string | Date; users: { id: string; fullName: string; email: string }[]; subscription: { id: string; plan: Plan; status: string; activatedAt: string | Date; expiresAt: string | Date | null; cancelledAt: string | Date | null } | null; _count: { licenseCodes: number; subscriptionLifecycleEvents: number }; subscriptionLifecycleEvents: CompanyHistoryEvent[] };
const planLabel: Record<Plan, string> = { ONE_MONTH: "١ مانگ", THREE_MONTHS: "٣ مانگ", ONE_YEAR: "١ ساڵ", LIFETIME: "هەمیشەیی" };
const statuses = ["ALL", "UNUSED", "USED", "EXPIRED", "REVOKED", "ACTIVE", "CANCELLED", "SUSPENDED"] as const;
const statusLabel: Record<Exclude<(typeof statuses)[number], "ALL">, string> = { UNUSED: "AVAILABLE", USED: "USED", EXPIRED: "EXPIRED", REVOKED: "REVOKED", ACTIVE: "ACTIVE", CANCELLED: "CANCELLED", SUSPENDED: "SUSPENDED" };

export default function SubscriptionAdminClient({ initialLicenses, initialCompanies }: { initialLicenses: License[]; initialCompanies: CompanyProfile[] }) {
  const [licenses, setLicenses] = useState(initialLicenses);
  const [companies, setCompanies] = useState(initialCompanies);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [codeCounts, setCodeCounts] = useState<CodeCount[] | null>(null);
  const [history, setHistory] = useState<AdminHistory[]>([]);
  const [plan, setPlan] = useState<Plan>("ONE_MONTH");
  const [count, setCount] = useState(10);
  const [codes, setCodes] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("ALL");
  const [filterPlan, setFilterPlan] = useState<Plan | "ALL">("ALL");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [suspendingCompany, setSuspendingCompany] = useState<string | null>(null);
  const [deletingLicense, setDeletingLicense] = useState<License | null>(null);
  const requestSequence = useRef(0);
  const planCounts = useMemo(() => Object.fromEntries((Object.keys(planLabel) as Plan[]).map((key) => [key, codeCounts ? codeCounts.filter((count) => count.plan === key && count.status === "UNUSED").reduce((sum, count) => sum + count._count._all, 0) : licenses.filter((license) => license.plan === key && license.status === "UNUSED").length])) as Record<Plan, number>, [codeCounts, licenses]);

  async function load() {
    const requestId = ++requestSequence.current;
    const params = new URLSearchParams({ q: query });
    if (status !== "ALL") params.set("status", status);
    if (filterPlan !== "ALL") params.set("plan", filterPlan);
    const res = await fetch(`/api/admin/subscriptions?${params}`, { cache: "no-store" });
    const body = await res.json();
    if (requestId !== requestSequence.current) return;
    if (res.ok) { setLicenses(body.data.licenses); setCompanies(body.data.companies || []); setAlerts(body.data.alerts || []); setCodeCounts(body.data.codeCounts || []); setHistory(body.data.history || []); }
    else setMessage("نەتوانرا داتاکان بهێنرێن.");
  }
  useEffect(() => {
    if (!query.trim()) return;
    const timer = window.setTimeout(() => { void load(); }, 350);
    return () => window.clearTimeout(timer);
    // The search snapshot is intentionally debounced; other filters are explicit controls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  async function action(payload: Record<string, unknown>) {
    setBusy(true); setMessage(null);
    try {
      const res = await fetch("/api/admin/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "کردارەکە سەرنەکەوت.");
      if (Array.isArray(body.data?.codes)) setCodes(body.data.codes);
      setMessage("کردارەکە بەسەرکەوتوویی ئەنجامدرا.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "کردارەکە سەرنەکەوت."); }
    finally { setBusy(false); }
  }
  async function suspend(companyId: string) {
    setSuspendingCompany(companyId);
  }
  function exportCodes() {
    const blob = new Blob([codes.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `rek-license-codes-${new Date().toISOString().slice(0, 10)}.txt`; link.click(); URL.revokeObjectURL(url);
  }
  async function copyCodes() { await navigator.clipboard.writeText(codes.join("\n")); setMessage("کۆدەکان کۆپیکران."); }

  return <div className="space-y-6" dir="rtl">
    <section className="flex flex-col gap-4 rounded-3xl border border-primary/20 bg-card p-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black text-primary">SUPER ADMIN RAHAND JAFF</p><h1 className="mt-1 text-3xl font-black">بەڕێوەبردنی بەشداربوون</h1><p className="mt-2 text-sm text-muted-foreground">کۆدی خام تەنها یەکجار لە دوای دروستکردن پیشان دەدرێت، پاشان تەنها هاشی پارێزراو هەڵدەگیرێت.</p></div><button type="button" onClick={() => void load()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black"><RefreshCw size={16} />نوێکردنەوە</button></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(Object.keys(planLabel) as Plan[]).map((key) => <div key={key} className="rounded-2xl border bg-card p-4"><p className="text-sm font-bold text-muted-foreground">{planLabel[key]}</p><p className="mt-1 text-3xl font-black">{planCounts[key]}</p><p className="text-xs text-muted-foreground">کۆدی بەردەست</p></div>)}</section>
    <section className="rounded-3xl border bg-card p-5"><h2 className="flex items-center gap-2 text-lg font-black"><KeyRound size={20} />دروستکردنی کۆدی نوێ</h2><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_130px_auto]"><select value={plan} onChange={(e) => setPlan(e.target.value as Plan)} className="h-11 rounded-xl border bg-background px-3 font-bold">{(Object.keys(planLabel) as Plan[]).map((key) => <option key={key} value={key}>{planLabel[key]}</option>)}</select><input type="number" min="1" max="500" value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-11 rounded-xl border bg-background px-3" /><button disabled={busy} onClick={() => void action({ action: "generate", plan, count })} className="h-11 rounded-xl bg-primary px-5 font-black text-primary-foreground disabled:opacity-60">دروستکردن</button></div>{codes.length ? <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-black">{codes.length} کۆد دروستکرا — ئێستا کۆپی یان هەناردەی بکە.</p><div className="flex gap-2"><button onClick={() => void copyCodes()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-card px-3 text-sm font-black"><Clipboard size={16} />کۆپی</button><button onClick={exportCodes} className="inline-flex h-10 items-center gap-2 rounded-xl bg-card px-3 text-sm font-black"><Download size={16} />TXT</button></div></div><pre dir="ltr" className="mt-3 max-h-44 overflow-auto rounded-xl bg-background p-3 text-xs">{codes.join("\n")}</pre></div> : null}</section>
    <section className="flex flex-wrap items-end gap-2 rounded-2xl border bg-card p-3"><label className="text-xs font-bold">دۆخ<select value={status} onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])} className="mt-1 block h-10 rounded-xl border bg-background px-2 text-sm">{statuses.map((item) => <option key={item} value={item}>{item === "ALL" ? "هەموو دۆخەکان" : statusLabel[item]}</option>)}</select></label><label className="text-xs font-bold">پلان<select value={filterPlan} onChange={(event) => setFilterPlan(event.target.value as Plan | "ALL")} className="mt-1 block h-10 rounded-xl border bg-background px-2 text-sm"><option value="ALL">هەموو پلانەکان</option>{(Object.keys(planLabel) as Plan[]).map((item) => <option key={item} value={item}>{planLabel[item]}</option>)}</select></label><label className="min-w-52 flex-1 text-xs font-bold">گەڕان<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="کۆد، ناسنامە، کۆمپانیا، بەکارهێنەر" className="mt-1 block h-10 w-full rounded-xl border bg-background px-3 text-sm" /></label><button type="button" onClick={() => void load()} className="h-10 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">گەڕان</button></section>
    {message ? <p role="status" className="rounded-xl bg-muted px-4 py-3 text-sm">{message}</p> : null}
    {alerts.length ? <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5"><h2 className="text-lg font-black">ئاگادارییەکانی بەکارهێنانی کۆد</h2><div className="mt-3 space-y-2">{alerts.map((alert) => <div key={alert.id} className="rounded-xl bg-card/80 px-3 py-2 text-sm"><b>{alert.title}</b><p className="mt-1 text-muted-foreground">{alert.message}</p><time dir="ltr" className="mt-1 block text-xs text-muted-foreground">{new Date(alert.createdAt).toLocaleString()}</time></div>)}</div></section> : null}
    <section className="rounded-3xl border bg-card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-black">کۆدەکان</h2><form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void load(); }}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="گەڕان بە کۆد یان کۆمپانیا" className="h-10 rounded-xl border bg-background px-3 text-sm" /></form></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[880px] text-right text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="p-2">ناسنامە</th><th className="p-2">پلان/دۆخ</th><th className="p-2">کۆمپانیا/بەکارهێنەر</th><th className="p-2">دروست/بەکارهێنان</th><th className="p-2">بەسەرچوون</th><th className="p-2">کردار</th></tr></thead><tbody>{licenses.map((license) => <tr key={license.id} className="border-b last:border-0"><td dir="ltr" className="p-2 text-xs">…{license.id.slice(-10)}</td><td className="p-2"><b>{planLabel[license.plan]}</b><span className="mr-2 rounded bg-muted px-1 text-xs">{statusLabel[license.status as Exclude<(typeof statuses)[number], "ALL">] || license.status}</span></td><td className="p-2">{license.company?.name || "—"}<span className="mr-1 block text-xs text-muted-foreground">{license.usedByUser?.fullName || ""}</span></td><td dir="ltr" className="p-2 text-xs">{new Date(license.createdAt).toLocaleDateString()} / {license.usedAt ? new Date(license.usedAt).toLocaleDateString() : "—"}</td><td className="p-2" dir="ltr">{license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : "∞"}</td><td className="flex gap-2 p-2"><button disabled={busy || license.status === "REVOKED"} onClick={() => void action({ action: "revoke", licenseId: license.id })} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"><ShieldBan size={14} />وەستاندن</button><button disabled={busy || license.status !== "UNUSED" || Boolean(license.companyId) || Boolean(license.currentSubscription) || Boolean(license._count?.lifecycleEvents)} onClick={() => setDeletingLicense(license)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"><Trash2 size={14} />سڕینەوە</button></td></tr>)}</tbody></table></div></section>
    <section className="rounded-3xl border bg-card p-5"><h2 className="text-lg font-black">مێژووی هەموو کۆمپانیاکان</h2><p className="mt-1 text-sm text-muted-foreground">تەنانەت کۆمپانیای بێ پلانیش لێرە پیشان دەدرێت؛ مێژوو ناکرێت بسڕدرێتەوە.</p><div className="mt-4 space-y-3">{companies.map((company) => <article key={company.id} className="rounded-2xl border bg-background p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><b>{company.name}</b><p dir="ltr" className="mt-1 text-xs text-muted-foreground">{company.code || company.id} · {company.email}</p><p className="mt-1 text-xs text-muted-foreground">خاوەن: {company.users[0]?.fullName || "—"} · {new Date(company.createdAt).toLocaleDateString()}</p></div><div className="text-left"><span className="rounded-full bg-muted px-2 py-1 text-xs font-black">{company.subscription ? statusLabel[company.subscription.status as Exclude<(typeof statuses)[number], "ALL">] || company.subscription.status : "هیچ پلانێکی نەکڕیوە"}</span><p className="mt-2 text-xs">{company.subscription ? planLabel[company.subscription.plan] : "—"} · {company._count.subscriptionLifecycleEvents} مێژوو</p></div></div>{company.subscription ? <div className="mt-3 flex flex-wrap gap-2 text-xs"><span>چالاکسازی: <time dir="ltr">{new Date(company.subscription.activatedAt).toLocaleString()}</time></span><span>بەسەرچوون: <time dir="ltr">{company.subscription.expiresAt ? new Date(company.subscription.expiresAt).toLocaleString() : "∞"}</time></span><button disabled={busy} onClick={() => void action({ action: "extend", companyId: company.id, plan: company.subscription!.plan })} className="rounded-lg bg-primary/10 px-2 py-1 font-bold text-primary">درێژکردنەوە</button>{company.subscription.status === "ACTIVE" ? <button disabled={busy} onClick={() => void suspend(company.id)} className="rounded-lg bg-destructive/10 px-2 py-1 font-bold text-destructive">وەستاندن</button> : null}</div> : null}<div className="mt-3 space-y-1 border-t pt-3">{company.subscriptionLifecycleEvents.length ? company.subscriptionLifecycleEvents.map((event) => <p key={event.id} className="text-xs text-muted-foreground"><b>{event.plan ? planLabel[event.plan] : "—"}</b> · {event.status || event.type} · {event.actionSource} · <time dir="ltr">{new Date(event.finalizedAt || event.createdAt).toLocaleString()}</time>{event.codeFingerprint ? ` · ${event.codeFingerprint}` : ""}</p>) : <p className="text-xs text-muted-foreground">هیچ پلانێکی نەکڕیوە.</p>}</div></article>)}{!companies.length ? <p className="text-sm text-muted-foreground">هیچ کۆمپانیایەک بەم فلتەرانە نەدۆزرایەوە.</p> : null}</div></section>
    {history.length ? <section className="rounded-3xl border bg-card p-5"><h2 className="text-lg font-black">مێژووی بەشداربوونەکان</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-right text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="p-2">کۆمپانیا</th><th className="p-2">بەکارهێنەر</th><th className="p-2">پلان/ماوە</th><th className="p-2">دۆخ/سەرچاوە</th><th className="p-2">کۆد</th><th className="p-2">کات</th></tr></thead><tbody>{history.map((event) => <tr key={event.id} className="border-b last:border-0"><td className="p-2"><b>{event.company.name}</b><span dir="ltr" className="mr-2 text-xs text-muted-foreground">{event.company.email}</span></td><td className="p-2">{event.user?.fullName || "SYSTEM"}</td><td className="p-2">{event.plan ? planLabel[event.plan] : "—"}<span className="mr-1 text-xs text-muted-foreground">{event.durationDays ? `${event.durationDays}d + ${event.bonusDays} bonus` : "∞"}</span></td><td className="p-2">{event.status || event.type}<span className="mr-1 text-xs text-muted-foreground">{event.actionSource}</span></td><td dir="ltr" className="p-2 text-xs">{event.codeFingerprint || "—"}</td><td dir="ltr" className="p-2 text-xs">{event.finalizedAt ? new Date(event.finalizedAt).toLocaleString() : new Date(event.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div></section> : null}
    <ConfirmDialog open={Boolean(suspendingCompany)} title="وەستاندنی بەشداربوون" description="ئەم پلانە لەلایەن ئەدمینەوە وەستێنراو دەبێت. دەستگەیشتن یەکسەر داخراو دەبێت، بەڵام هیچ داتایەک ناسڕێتەوە." confirmText="وەستاندن" onCancel={() => setSuspendingCompany(null)} onConfirm={() => { const companyId = suspendingCompany; setSuspendingCompany(null); if (companyId) void action({ action: "suspend", companyId }); }} />
    <ConfirmDialog open={Boolean(deletingLicense)} title="سڕینەوەی کۆدی بەردەست" description={deletingLicense ? `کۆدی ${deletingLicense.id.slice(-10)} بۆ ${planLabel[deletingLicense.plan]} دەسڕێتەوە. ئەم کردارە تەنها بۆ کۆدی بێ مێژوو ڕێگەپێدراوە.` : ""} confirmText="سڕینەوە" onCancel={() => setDeletingLicense(null)} onConfirm={() => { const licenseId = deletingLicense?.id; setDeletingLicense(null); if (licenseId) void action({ action: "delete", licenseId }); }} />
  </div>;
}
