"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Volume2 } from "lucide-react";
import { DEFAULT_PUSH_CATEGORIES, PUSH_CATEGORIES, PUSH_CATEGORY_LABELS, type PushCategoryMap } from "@/lib/pwa/categories";
import { getRegistration, requestNotificationPermission, subscribeToPush, unsubscribeFromPush } from "@/lib/pwa/client";
import { playNotificationTone } from "@/lib/pwa/sound";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Prefs = { pushEnabled: boolean; soundEnabled: boolean; categories: PushCategoryMap; deviceCount: number };
const initial: Prefs = { pushEnabled: false, soundEnabled: false, categories: { ...DEFAULT_PUSH_CATEGORIES }, deviceCount: 0 };

export default function NotificationPrefsPanel({ className = "" }: { className?: string }) {
  const [prefs, setPrefs] = useState(initial);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState<"sound" | "push" | "categories" | null>(null);

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

  useEffect(() => { let active = true; void load().catch(() => {}).finally(() => { if (active) setReady(true); }); return () => { active = false; }; }, []);

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
    try {
      if (next) {
        const permission = await requestNotificationPermission();
        if (permission !== "granted") throw new Error("PERMISSION_DENIED");
        const registration = await getRegistration();
        if (!registration || !(await subscribeToPush(registration))) throw new Error("SUBSCRIBE_FAILED");
      } else await unsubscribeFromPush();
      const saved = await persist({ pushEnabled: next });
      setPrefs((value) => ({ ...value, pushEnabled: Boolean(saved.pushEnabled ?? saved.enabled) }));
      appToast.success(next ? "ئاگادارکردنەوەی Push چالاک کرا." : "ئاگادارکردنەوەی Push ناچالاک کرا.");
      await load();
    } catch {
      appToast.error("چالاککردنی ئاگادارکردنەوەی Push سەرنەکەوت. ڕێکخستنی دەنگ نەگۆڕاوە.");
    } finally { setSaving(null); }
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
      <div className="rounded-2xl border p-4"><label className="flex items-center justify-between gap-4"><span><strong className="block text-sm">ئاگادارکردنەوەی Push</strong><small className="text-muted-foreground">مۆڵەتی وێبگەڕ و Service Worker تەنها بۆ Push پێویستن.</small></span><input type="checkbox" checked={prefs.pushEnabled} disabled={!ready || saving !== null} onChange={(event) => void togglePush(event.target.checked)} aria-label="Push"/></label><p className="mt-2 text-xs text-muted-foreground">ئامێرە تۆمارکراوەکان: {prefs.deviceCount}</p></div>
      <div className="rounded-2xl border p-4"><strong className="text-sm">جۆرەکانی ئاگادارکردنەوە</strong><div className="mt-3 grid gap-2 sm:grid-cols-2">{PUSH_CATEGORIES.map((key) => <label key={key} className="flex justify-between text-xs"><span>{PUSH_CATEGORY_LABELS[key].ku}</span><input type="checkbox" checked={prefs.categories[key]} disabled={!prefs.pushEnabled || saving !== null} onChange={async (event) => { const categories = {...prefs.categories, [key]: event.target.checked}; setPrefs((p) => ({...p, categories})); setSaving("categories"); try { await persist({categories}); } catch { appToast.error("پاشەکەوتکردنی جۆرەکان سەرنەکەوت."); await load(); } finally { setSaving(null); } }}/></label>)}</div></div>
      {saving ? <p className="inline-flex items-center gap-2 text-xs"><Loader2 className="size-3 animate-spin"/>پاشەکەوت دەکرێت…</p> : null}
    </div>
  </section>;
}
