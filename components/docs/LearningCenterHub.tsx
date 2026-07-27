"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  Construction,
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

  const sortedCategories = [...DOC_CATEGORIES].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-[#FFAE42]/25 bg-gradient-to-br from-[#FFAE42]/10 via-white to-amber-50/50 p-6 sm:p-10">
        <div
          className="pointer-events-none absolute -left-10 -top-10 size-40 rounded-full bg-[#FFAE42]/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 -right-8 size-48 rounded-full bg-amber-200/30 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFAE42]/30 bg-white/80 px-3 py-1 text-xs font-bold text-[#FFAE42] backdrop-blur">
              <BookOpen size={14} />
              فێرکاری فەرمی ڕێک ERP
            </div>
            <h1 className="text-3xl font-black text-[#FFAE42] sm:text-4xl lg:text-5xl">
              فێرکاری سیستەم
            </h1>
            <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
              ڕێنمایی تەواو بە کوردی سۆرانی — هەموو بەشەکانی ERP بە شێوەیەکی
              سادە و پیشەیی. بۆ دەستپێکەران و بەڕێوەبەران.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3 text-sm">
            <div className="rounded-2xl border bg-white/90 px-4 py-3 shadow-sm">
              <p className="text-2xl font-black text-[#FFAE42]">
                {ALL_DOC_MODULES.length}
              </p>
              <p className="text-slate-500">مۆدیول</p>
            </div>
            <div className="rounded-2xl border bg-white/90 px-4 py-3 shadow-sm">
              <p className="text-2xl font-black text-[#FFAE42]">
                {sortedCategories.length}
              </p>
              <p className="text-slate-500">پۆل</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-8 max-w-2xl">
          <Search
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={20}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="گەڕان لە فێرکاری… (وەک: فرۆشتن، کۆگا، پسوولە)"
            className="w-full rounded-2xl border border-[#FFAE42]/20 bg-white py-4 pe-12 ps-4 text-base shadow-sm outline-none transition focus:border-[#FFAE42] focus:ring-2 focus:ring-[#FFAE42]/20"
            aria-label="گەڕان لە فێرکاری"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
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
        <div className="rounded-3xl border border-dashed p-12 text-center">
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
                  "group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300",
                  "hover:-translate-y-1 hover:border-[#FFAE42]/40 hover:shadow-[0_16px_40px_rgba(255,174,66,0.15)]",
                  "animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                )}
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[#FFAE42]/10 text-[#FFAE42] transition group-hover:scale-110 group-hover:bg-[#FFAE42]/20">
                    <Icon size={24} />
                  </div>
                  {mod.underDevelopment ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
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
      <section className="rounded-3xl border bg-muted/30 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-[#FFAE42]">
          <Sparkles size={20} />
          <h2 className="text-lg font-bold">ئامۆژگاری خێرا</h2>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "سەرەتا «داشبۆرد» و «کۆمپانیا» بخوێنەرەوە.",
            "پێش فرۆشتن «کاڵاکان» و «کۆگا» ڕێکبخە.",
            "بۆ پرسیاری خێرا «یاریدەدەری زیرەک» بەکاربهێنە.",
          ].map((tip) => (
            <li
              key={tip}
              className="rounded-xl border bg-white px-4 py-3 text-sm leading-relaxed"
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
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition",
        active
          ? "border-[#FFAE42] bg-[#FFAE42] text-white shadow-sm"
          : "bg-white hover:border-[#FFAE42]/40 hover:bg-[#FFAE42]/5"
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px]",
          active ? "bg-white/20" : "bg-muted"
        )}
      >
        {count}
      </span>
    </button>
  );
}
