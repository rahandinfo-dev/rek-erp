"use client";

import { useState } from "react";
import { Check, Grid2X2, Menu, MoreHorizontal, PanelBottom, Plus, RectangleHorizontal, ShipWheel, Sheet } from "lucide-react";
import type { NavigationStyle } from "@/lib/navigation/styles";

const styles: Array<{ id: NavigationStyle; name: string; description: string; icon: typeof Grid2X2 }> = [
  { id: "SIDE_MENU", name: "Side Menu", description: "مێنیوی لای ڕاست بە ناونیشان و گرووپ.", icon: Menu },
  { id: "GRID", name: "Grid", description: "ڕێکخستنی مۆدیولەکان بە دوو کارتی ڕیز.", icon: Grid2X2 },
  { id: "TAB_BAR", name: "Tab Bar", description: "گەشتکردن لە شریتی خوارەوە بە دوگمەی زیاتر.", icon: PanelBottom },
  { id: "FAB", name: "FAB", description: "دوگمەی فڵۆتەری بۆ کردارە سەرەکییەکان.", icon: Plus },
  { id: "SHEET", name: "Sheet", description: "مێنیوی خشتەیی کە لە لای ڕاست یان خوارەوە دەکرێتەوە.", icon: Sheet },
  { id: "THREE_DOTS", name: "Three Dots", description: "پۆپۆڤەری مێنیو بە سێ خاڵ.", icon: MoreHorizontal },
  { id: "RECTANGULAR", name: "Rectangular", description: "ڕێڵی بچووک و چوارگۆشەیی لە لای ڕاست.", icon: RectangleHorizontal },
  { id: "RUDDER", name: "Rudder", description: "گەشتی ڕادیالی لە دەوری ناوەند.", icon: ShipWheel },
];

function Preview({ style }: { style: NavigationStyle }) {
  if (style === "SIDE_MENU") return <div className="nav-style-preview flex h-20 overflow-hidden rounded-xl border bg-background"><div className="w-1/3 space-y-2 bg-primary/10 p-2"><i/><i/><i/></div><div className="flex-1 p-3"><b/></div></div>;
  if (style === "GRID") return <div className="nav-style-preview grid h-20 grid-cols-2 gap-1 rounded-xl border bg-background p-2"><i/><i/><i/><i/></div>;
  if (style === "TAB_BAR") return <div className="nav-style-preview relative h-20 rounded-xl border bg-background"><div className="absolute inset-x-2 bottom-2 flex justify-around rounded-lg bg-primary/10 p-2"><i/><i/><i/><i/></div></div>;
  if (style === "FAB") return <div className="nav-style-preview relative h-20 rounded-xl border bg-background"><i className="absolute bottom-2 right-2 !size-8 !rounded-full !bg-primary"/></div>;
  if (style === "SHEET") return <div className="nav-style-preview relative h-20 overflow-hidden rounded-xl border bg-background"><div className="absolute inset-y-0 right-0 w-2/5 space-y-1 bg-primary/10 p-2"><i/><i/><i/></div></div>;
  if (style === "THREE_DOTS") return <div className="nav-style-preview relative h-20 rounded-xl border bg-background"><span className="absolute right-3 top-2 text-primary">•••</span><div className="absolute right-2 top-8 w-1/2 space-y-1 rounded bg-primary/10 p-2"><i/><i/></div></div>;
  if (style === "RECTANGULAR") return <div className="nav-style-preview flex h-20 rounded-xl border bg-background p-2"><div className="flex w-1/4 flex-col gap-1"><i/><i/><i/></div></div>;
  return <div className="nav-style-preview relative h-20 rounded-xl border bg-background"><i className="absolute bottom-3 left-1/2 !size-8 !-translate-x-1/2 !rounded-full !bg-primary"/><i className="absolute bottom-10 left-1/4 !rounded-full"/><i className="absolute bottom-10 right-1/4 !rounded-full"/></div>;
}

export default function NavigationStyleSettings({ initialStyle }: { initialStyle: NavigationStyle }) {
  const [selected, setSelected] = useState<NavigationStyle>(initialStyle);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function apply() {
    setSaving(true); setMessage("");
    try {
      const res = await fetch("/api/user/navigation-style", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ style: selected }) });
      if (!res.ok) throw new Error("save failed");
      window.dispatchEvent(new CustomEvent("rek:navigation-style", { detail: selected }));
      setMessage("ستایلەکە پاشەکەوت کرا.");
    } catch { setMessage("پاشەکەوتکردنی ستایل سەرنەکەوت."); } finally { setSaving(false); }
  }
  return <div className="space-y-6" dir="rtl"><header><h1 className="text-3xl font-black text-primary">ڕێکخستنی ستایلی سیستەم</h1><p className="mt-2 text-sm text-muted-foreground">هەمان مۆدیول و دەسەڵات بە هەشت شێوازی جیاواز پیشان دەدرێت.</p></header><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{styles.map((style) => { const Icon = style.icon; const active = selected === style.id; return <button key={style.id} type="button" onClick={() => setSelected(style.id)} aria-pressed={active} className={`rounded-2xl border p-4 text-start transition focus-visible:ring-[3px] focus-visible:ring-ring/35 ${active ? "border-primary bg-primary/10" : "bg-card hover:border-primary/40"}`}><div className="flex items-center justify-between"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={20} /></span>{active ? <Check size={18} className="text-primary" /> : null}</div><div className="mt-4"><Preview style={style.id} /></div><p className="mt-4 font-black">{style.name}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{style.description}</p></button>; })}</div><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => void apply()} disabled={saving} className="rounded-2xl bg-primary px-5 py-3 font-black text-primary-foreground disabled:opacity-60">{saving ? "پاشەکەوت دەکرێت…" : "جێبەجێکردن"}</button><button type="button" onClick={() => setSelected("SIDE_MENU")} className="rounded-2xl border px-5 py-3 font-black">گەڕاندنەوە بۆ بنەڕەت</button>{message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}</div></div>;
}
