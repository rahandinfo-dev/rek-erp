"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Volume2 } from "lucide-react";
import { DEFAULT_PUSH_CATEGORIES, PUSH_CATEGORIES, PUSH_CATEGORY_LABELS, type PushCategoryMap } from "@/lib/pwa/categories";
import { enablePush, getRegistration, unsubscribeFromPush, type PushEnableFailure } from "@/lib/pwa/client";
import { playNotificationTone } from "@/lib/pwa/sound";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Prefs = { pushEnabled: boolean; soundEnabled: boolean; categories: PushCategoryMap; deviceCount: number };
const initial: Prefs = { pushEnabled: false, soundEnabled: false, categories: { ...DEFAULT_PUSH_CATEGORIES }, deviceCount: 0 };
type Diagnostics = { supported: boolean; permission: NotificationPermission | "unavailable"; worker: "checking" | "ready" | "unavailable"; subscription: "checking" | "active" | "inactive" };
const FAILURE_MESSAGES: Record<PushEnableFailure, string> = {
  UNSUPPORTED_BROWSER: "ئەم وێبگەڕە پشتگیری ئاگادارکردنەوەی Push ناکات.",
  PERMISSION_DENIED: "وێبگەڕ ڕێگەی ئاگادارکردنەوەی Push ـی نەدا. تکایە لە ڕێکخستنەکانی وێبگەڕ ڕێگە بدە.",
  SERVICE_WORKER_UNAVAILABLE: "Service Worker ئامادە نەبوو. تکایە پەڕەکە نوێ بکەرەوە و دووبارە هەوڵ بدە.",
  VAPID_MISSING: "ڕێکخستنی Push لە سێرڤەر تەواو نییە. تکایە بەڕێوەبەر VAPID ڕێکبخات.",
  VAPID_INVALID: "کلیلی گشتی VAPID دروست نییە. تکایە بەڕێوەبەر ڕێکی بخات.",
  PERSISTENCE_FAILED: "بەشداری Push لە سێرڤەر پاشەکەوت نەکرا. تکایە دووبارە هەوڵ بدە.",
  SUBSCRIPTION_FAILED: "دروستکردنی بەشداری Push سەرنەکەوت.",
};

export default function NotificationPrefsPanel({ className = "" }: { className?: string }) {
  const [prefs, setPrefs] = useState(initial);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState<"sound" | "push" | "categories" | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics>({ supported: false, permission: "unavailable", worker: "checking", subscription: "checking" });
  const [pushMessage, setPushMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function inspectBrowser() {
    const supported = "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
    if (!supported) {
      setDiagnostics({ supported: false, permission: "unavailable", worker: "unavailable", subscription: "inactive" });
      return false;
    }
    const registration = await getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    setDiagnostics({ supported: true, permission: Notification.permission, worker: registration ? "ready" : "unavailable", subscription: subscription ? "active" : "inactive" });
    return Boolean(subscription);
  }

  async function load() {
    const response = await fetch("/api/pwa/prefs", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message);
    setPrefs({
      pushEnabled: Boolean(result.data.pushEnabled ?? result.data.enabled),
      soundEnabled: Boolean(result.data.soundEnabled),
      categories: { ...DEFAULT_PUSH_CATEGORIES, ...(result.data.categories || {}) },
      deviceCount: Number(result.data.deviceCount || 0),
    });
  }

  useEffect(() => {
    let active = true;
    const start = window.setTimeout(() => {
      void Promise.all([load(), inspectBrowser()]).catch(() => {}).finally(() => { if (active) setReady(true); });
    }, 0);
    return () => { active = false; window.clearTimeout(start); };
  }, []);

  async function persist(body: Record<string, unknown>) {
    const response = await fetch("/api/pwa/prefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message);
    return result.data;
  }

  async function toggleSound(next: boolean) {
    const previous = prefs.soundEnabled;
    setPrefs((value) => ({ ...value, soundEnabled: next }));
    setSaving("sound");
    try {
      const saved = await persist({ soundEnabled: next });
      setPrefs((value) => ({ ...value, soundEnabled: Boolean(saved.soundEnabled) }));
      appToast.success(next ? "دەنگی ئاگادارکردنەوە چالاک کرا." : "دەنگی ئاگادارکردنەوە ناچالاک کرا.");
    } catch {
      setPrefs((value) => ({ ...value, soundEnabled: previous }));
      appToast.error("هەڵەیەک لە پاشەکەوتکردنی ڕێکخستنی دەنگ ڕوویدا.");
    } finally { setSaving(null); }
  }

  async function togglePush(next: boolean) {
    setSaving("push");
    setPushMessage(null);
    try {
      if (next) {
        const result = await enablePush();
        if (!result.ok) {
          setPushMessage({ kind: "error", text: FAILURE_MESSAGES[result.reason] });
          return;
        }
      } else await unsubscribeFromPush();
      const saved = await persist({ pushEnabled: next });
      setPrefs((value) => ({ ...value, pushEnabled: Boolean(saved.pushEnabled ?? saved.enabled) }));
      appToast.success(next ? "ئاگادارکردنەوەی Push چالاک کرا." : "ئاگادارکردنەوەی Push ناچالاک کرا.");
      setPushMessage({ kind: "success", text: next ? "Push بە سەرکەوتوویی چالاک کرا." : "Push بە سەرکەوتوویی ناچالاک کرا." });
      await load();
    } catch {
      const correlationId = crypto.randomUUID().slice(0, 8);
      setPushMessage({ kind: "error", text: `هەڵەیەکی نەخوازراو ڕوویدا. کۆدی بەدواداچوون: ${correlationId}` });
      appToast.error("چالاککردنی Push سەرنەکەوت. ڕێکخستنی دەنگ نەگۆڕاوە.");
    } finally { await inspectBrowser().catch(() => {}); setSaving(null); }
  }

  async function testSound() {
    try { await playNotificationTone(); appToast.success("دەنگ بە سەرکەوتوویی تاقی کرایەوە."); }
    catch { appToast.error("وێبگەڕ ڕێگە بە لێدانی دەنگ نەدا. تکایە دووبارە تاقی بکەرەوە."); }
  }

  return <section className={cn("rounded-3xl border border-border bg-card p-6 sm:p-8", className)} aria-labelledby="notification-prefs-title">
    <div className="flex items-center gap-3"><Bell className="size-6 text-primary"/><div><h2 id="notification-prefs-title" className="text-xl font-bold">ڕێکخستنی ئاگادارکردنەوە</h2><p className="text-sm text-muted-foreground">دەنگ و Push دوو ڕێکخستنی سەربەخۆن.</p></div></div>
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border p-4">
        <label className="flex items-center justify-between gap-4"><span><strong className="block text-sm">دەنگی ئاگادارکردنەوە</strong><small className="text-muted-foreground">پێویستی بە Service Worker یان مۆڵەتی Notification نییە.</small></span><input type="checkbox" checked={prefs.soundEnabled} disabled={!ready || saving !== null} onChange={(event) => void toggleSound(event.target.checked)} aria-label="دەنگی ئاگادارکردنەوە"/></label>
        <button type="button" onClick={() => void testSound()} className="mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><Volume2 size={16}/>تاقیکردنەوەی دەنگ</button>
      </div>
      <div className="rounded-2xl border p-4"><label className="flex items-center justify-between gap-4"><span><strong className="block text-sm">ئاگادارکردنەوەی Push</strong><small className="text-muted-foreground">مۆڵەتی وێبگەڕ و Service Worker تەنها بۆ Push پێویستن.</small></span><input type="checkbox" checked={prefs.pushEnabled && diagnostics.subscription === "active"} disabled={!ready || saving !== null || !diagnostics.supported} onChange={(event) => void togglePush(event.target.checked)} aria-label="Push"/></label>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div><dt className="font-bold">پشتگیری وێبگەڕ</dt><dd>{diagnostics.supported ? "پشتگیریکراوە" : "پشتگیری ناکرێت"}</dd></div><div><dt className="font-bold">مۆڵەت</dt><dd dir="ltr">{diagnostics.permission}</dd></div><div><dt className="font-bold">Service Worker</dt><dd>{diagnostics.worker === "ready" ? "ئامادەیە" : diagnostics.worker === "checking" ? "پشکنین…" : "ئامادە نییە"}</dd></div><div><dt className="font-bold">بەشداری</dt><dd>{diagnostics.subscription === "active" ? "چالاکە" : diagnostics.subscription === "checking" ? "پشکنین…" : "ناچالاکە"}</dd></div></dl>
        <p className="mt-2 text-xs text-muted-foreground">ئامێرە تۆمارکراوەکان: {prefs.deviceCount}</p>{pushMessage ? <p role="status" className={cn("mt-2 border p-2 text-xs", pushMessage.kind === "error" ? "border-red-500 text-red-700" : "border-green-600 text-green-700")}>{pushMessage.text}</p> : null}</div>
      <div className="rounded-2xl border p-4"><strong className="text-sm">جۆرەکانی ئاگادارکردنەوە</strong><div className="mt-3 grid gap-2 sm:grid-cols-2">{PUSH_CATEGORIES.map((key) => <label key={key} className="flex justify-between text-xs"><span>{PUSH_CATEGORY_LABELS[key].ku}</span><input type="checkbox" checked={prefs.categories[key]} disabled={!prefs.pushEnabled || saving !== null} onChange={async (event) => { const categories = {...prefs.categories, [key]: event.target.checked}; setPrefs((p) => ({...p, categories})); setSaving("categories"); try { await persist({categories}); } catch { appToast.error("پاشەکەوتکردنی جۆرەکان سەرنەکەوت."); await load(); } finally { setSaving(null); } }}/></label>)}</div></div>
      {saving ? <p className="inline-flex items-center gap-2 text-xs"><Loader2 className="size-3 animate-spin"/>پاشەکەوت دەکرێت…</p> : null}
    </div>
  </section>;
}
