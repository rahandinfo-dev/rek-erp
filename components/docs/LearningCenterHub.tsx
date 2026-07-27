"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  Construction,
  GraduationCap,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { DOC_CATEGORIES } from "@/lib/docs/categories";
import { ALL_DOC_MODULES } from "@/lib/docs/catalog";
import { searchDocModules } from "@/lib/docs/search";
import type { DocCategoryId } from "@/lib/docs/types";
import { cn } from "@/lib/utils";

export default function LearningCenterHub() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<DocCategoryId | "all">(
    "all"
  );

  const searchResults = useMemo(
    () => searchDocModules(ALL_DOC_MODULES, query),
    [query]
  );

  const filteredModules = useMemo(() => {
    if (query.trim()) {
      return searchResults.map((r) => r.module);
    }
    if (activeCategory === "all") return ALL_DOC_MODULES;
    return ALL_DOC_MODULES.filter((m) => m.categoryId === activeCategory);
  }, [query, searchResults, activeCategory]);

  const sortedCategories = [...DOC_CATEGORIES]
    .sort((a, b) => a.order - b.order)
    .filter(
      (cat) => ALL_DOC_MODULES.some((m) => m.categoryId === cat.id)
    );

  return (
    <div className="space-y-8">
      {/* REK ERP Academy Hero */}
      <section
        className="rek-academy-hero relative overflow-hidden border border-[#FFAE42]/30 p-6 sm:p-10"
        dir="rtl"
      >
        <div className="rek-academy-hero__bg" aria-hidden>
          <div className="rek-academy-hero__grid" />
          <div className="rek-academy-hero__glow rek-academy-hero__glow--a" />
          <div className="rek-academy-hero__glow rek-academy-hero__glow--b" />
          <div className="rek-academy-hero__glow rek-academy-hero__glow--c" />
          <div className="rek-academy-hero__scan" />
        </div>

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 border border-[#FFAE42]/40 bg-[#0b1220]/55 px-3 py-1.5 text-xs font-bold tracking-wide text-[#FFAE42] backdrop-blur-sm">
              <GraduationCap size={14} aria-hidden />
              ئەکادیمیای ڕێک ERP · فێرکاری فەرمی
            </div>
            <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              ئەکادیمیای ڕێک ERP
            </h1>
            <p className="text-base leading-relaxed text-slate-300 sm:text-lg">
              ڕێنمایی تەواو بە کوردی سۆرانی — هەموو بەشەکانی سیستەم بە شێوەیەکی
              سادە، ورد و پیشەیی. بۆ دەستپێکەران، ستاف و بەڕێوەبەران.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="inline-flex items-center gap-1.5 border border-white/10 bg-white/5 px-2.5 py-1">
                <BookOpen size={12} className="text-[#FFAE42]" aria-hidden />
                فێرکاری سیستەم
              </span>
              <span className="border border-white/10 bg-white/5 px-2.5 py-1">
                RTL · کوردی سۆرانی
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3 text-sm">
            <div className="min-w-[7.5rem] border border-[#FFAE42]/25 bg-[#0b1220]/70 px-4 py-3 backdrop-blur-sm">
              <p className="text-2xl font-black tabular-nums text-[#FFAE42]">
                {ALL_DOC_MODULES.length}
              </p>
              <p className="text-slate-400">مۆدیول</p>
            </div>
            <div className="min-w-[7.5rem] border border-[#FFAE42]/25 bg-[#0b1220]/70 px-4 py-3 backdrop-blur-sm">
              <p className="text-2xl font-black tabular-nums text-[#FFAE42]">
                {sortedCategories.length}
              </p>
              <p className="text-slate-400">پۆل</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative z-10 mt-8 max-w-2xl">
          <Search
            className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="گەڕان لە فێرکاری… (وەک: فرۆشتن، کۆگا، پسوولە، دراو)"
            className="w-full border border-[#FFAE42]/25 bg-[#0b1220]/80 py-4 pe-12 ps-4 text-base text-white shadow-[0_0_0_1px_rgba(255,174,66,0.08)] outline-none transition placeholder:text-slate-500 focus:border-[#FFAE42] focus:ring-2 focus:ring-[#FFAE42]/25"
            aria-label="گەڕان لە فێرکاری"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute start-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="پاککردنەوەی گەڕان"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </section>

      {/* Category nav */}
      <nav aria-label="پۆلەکانی فێرکاری" className="flex flex-wrap gap-2">
        <CategoryPill
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
          label="هەموو"
          count={ALL_DOC_MODULES.length}
        />
        {sortedCategories.map((cat) => (
          <CategoryPill
            key={cat.id}
            active={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
            label={cat.title}
            count={ALL_DOC_MODULES.filter((m) => m.categoryId === cat.id).length}
          />
        ))}
      </nav>

      {/* Results */}
      {query && (
        <p className="text-sm text-muted-foreground">
          {filteredModules.length} ئەنجام بۆ «{query}»
        </p>
      )}

      {filteredModules.length === 0 ? (
        <div className="border border-dashed p-12 text-center">
          <Search className="mx-auto mb-3 text-muted-foreground" size={32} />
          <p className="font-bold">هیچ ئەنجامێک نەدۆزرایەوە</p>
          <p className="mt-1 text-sm text-muted-foreground">
            وشەیەکی تر تاقی بکەرەوە یان پۆلێکی تر هەڵبژێرە
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredModules.map((mod, i) => {
            const Icon = mod.icon;
            const cat = sortedCategories.find((c) => c.id === mod.categoryId);
            return (
              <Link
                key={mod.slug}
                href={`/dashboard/settings/docs/${mod.slug}`}
                className={cn(
                  "group relative flex flex-col overflow-hidden border bg-card p-5 shadow-sm transition-all duration-300",
                  "hover:-translate-y-1 hover:border-[#FFAE42]/40 hover:shadow-[0_16px_40px_rgba(255,174,66,0.15)]",
                  "animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                )}
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex size-12 items-center justify-center bg-[#FFAE42]/10 text-[#FFAE42] transition group-hover:scale-110 group-hover:bg-[#FFAE42]/20">
                    <Icon size={24} />
                  </div>
                  {mod.underDevelopment ? (
                    <span className="inline-flex items-center gap-1 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      <Construction size={10} />
                      گەشەپێدان
                    </span>
                  ) : null}
                </div>
                <h2 className="text-lg font-bold leading-snug group-hover:text-[#FFAE42]">
                  {mod.title}
                </h2>
                {cat ? (
                  <p className="mt-1 text-xs font-semibold text-[#FFAE42]/80">
                    {cat.title}
                  </p>
                ) : null}
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {mod.shortDescription}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#FFAE42]">
                  خوێندنەوە
                  <ChevronLeft
                    size={16}
                    className="transition group-hover:-translate-x-1"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Quick tips */}
      <section className="border bg-muted/30 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-[#FFAE42]">
          <Sparkles size={20} />
          <h2 className="text-lg font-bold">ئامۆژگاری خێرا</h2>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "سەرەتا «داشبۆرد» و «دەربارەی کۆمپانیا» بخوێنەرەوە.",
            "پێش فرۆشتن «بەرهەمەکان» و «کۆگاکان» ڕێکبخە.",
            "بۆ پرسیاری خێرا «یاریدەدەری زیرەکی سیستەمی ڕێک» بەکاربهێنە.",
          ].map((tip) => (
            <li
              key={tip}
              className="border bg-white px-4 py-3 text-sm leading-relaxed"
            >
              {tip}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CategoryPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 border px-4 py-2 text-sm font-bold transition",
        active
          ? "border-[#FFAE42] bg-[#FFAE42] text-white shadow-sm"
          : "bg-white hover:border-[#FFAE42]/40 hover:bg-[#FFAE42]/5"
      )}
    >
      {label}
      <span
        className={cn(
          "px-1.5 py-0.5 text-[10px]",
          active ? "bg-white/20" : "bg-muted"
        )}
      >
        {count}
      </span>
    </button>
  );
}
