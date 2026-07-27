"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Construction,
  ExternalLink,
  List,
} from "lucide-react";
import { getCategoryById } from "@/lib/docs/categories";
import {
  DOC_SECTION_ORDER,
  type DocModule,
  type DocSectionKey,
} from "@/lib/docs/types";
import { cn } from "@/lib/utils";

type Props = {
  module: DocModule;
  allSlugs: { slug: string; title: string }[];
};

export default function DocsModuleView({ module: mod, allSlugs }: Props) {
  const category = getCategoryById(mod.categoryId);
  const Icon = mod.icon;
  const [openSections, setOpenSections] = useState<Set<DocSectionKey>>(() => {
    const base = new Set<DocSectionKey>(["overview", "steps"]);
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "") as DocSectionKey;
      if (hash && DOC_SECTION_ORDER.includes(hash)) base.add(hash);
    }
    return base;
  });
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as DocSectionKey;
    if (hash && DOC_SECTION_ORDER.includes(hash)) {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const relatedLinks = useMemo(() => {
    const relatedSection = mod.sections.related;
    return relatedSection.body
      .flatMap((line) => line.split(/[،,]/))
      .map((s) => s.trim())
      .filter(Boolean)
      .map((title) => {
        const found = allSlugs.find(
          (s) => s.title === title || s.title.includes(title)
        );
        return found ? { title: found.title, slug: found.slug } : null;
      })
      .filter(Boolean) as { title: string; slug: string }[];
  }, [mod.sections.related, allSlugs]);

  const toggleSection = (key: DocSectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => setOpenSections(new Set(DOC_SECTION_ORDER));
  const collapseAll = () => setOpenSections(new Set());

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {/* Main content */}
      <article className="min-w-0 flex-1 space-y-6">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="text-sm">
          <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
            <li>
              <Link
                href="/dashboard/settings"
                className="font-semibold hover:text-[#FFAE42]"
              >
                ڕێکخستنەکان
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link
                href="/dashboard/settings/docs"
                className="font-semibold hover:text-[#FFAE42]"
              >
                فێرکاری سیستەم
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-bold text-foreground">{mod.title}</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="rounded-3xl border border-[#FFAE42]/20 bg-gradient-to-br from-[#FFAE42]/5 to-white p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFAE42]/15 text-[#FFAE42]">
                <Icon size={28} />
              </div>
              <div>
                {category ? (
                  <p className="text-xs font-bold text-[#FFAE42]">
                    {category.title}
                  </p>
                ) : null}
                <h1 className="text-2xl font-black text-[#FFAE42] sm:text-3xl">
                  {mod.title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  {mod.shortDescription}
                </p>
              </div>
            </div>
            {mod.appRoute ? (
              <Link
                href={mod.appRoute}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#FFAE42] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#e89d35]"
              >
                <ExternalLink size={16} />
                کردنەوەی مۆدیول
              </Link>
            ) : null}
          </div>

          {mod.underDevelopment && mod.developmentNote ? (
            <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              <Construction
                className="mt-0.5 shrink-0 text-amber-600"
                size={18}
              />
              <div>
                <p className="font-bold">لە قۆناغی گەشەپێداندایە</p>
                <p className="mt-1">{mod.developmentNote}</p>
              </div>
            </div>
          ) : null}
        </header>

        {/* Mobile TOC toggle */}
        <button
          type="button"
          onClick={() => setTocOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border bg-muted/40 px-4 py-3 text-sm font-bold lg:hidden"
        >
          <span className="inline-flex items-center gap-2">
            <List size={18} />
            ناوەڕۆکی لاپەڕە
          </span>
          <ChevronDown
            size={18}
            className={cn("transition", tocOpen && "rotate-180")}
          />
        </button>

        {tocOpen ? (
          <div className="rounded-2xl border bg-white p-4 lg:hidden">
            <DocsToc
              module={mod}
              openSections={openSections}
              onJump={(key) => {
                setOpenSections((prev) => new Set([...prev, key]));
                setTocOpen(false);
                setTimeout(() => {
                  document
                    .getElementById(key)
                    ?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
            />
          </div>
        ) : null}

        {/* Expand controls */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="rounded-xl border px-3 py-1.5 text-xs font-bold hover:bg-muted"
          >
            کردنەوەی هەموو
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded-xl border px-3 py-1.5 text-xs font-bold hover:bg-muted"
          >
            داخستنی هەموو
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {DOC_SECTION_ORDER.map((key) => {
            const section = mod.sections[key];
            const isOpen = openSections.has(key);
            return (
              <section
                key={key}
                id={key}
                className="scroll-mt-24 overflow-hidden rounded-2xl border bg-card shadow-sm transition"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start transition hover:bg-muted/40"
                  aria-expanded={isOpen}
                >
                  <span className="font-bold">{section.title}</span>
                  <ChevronDown
                    size={18}
                    className={cn(
                      "shrink-0 text-muted-foreground transition-transform duration-300",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-3 border-t px-5 py-4 text-sm leading-relaxed text-slate-700">
                      {section.body.map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* Related modules */}
        {relatedLinks.length > 0 ? (
          <footer className="rounded-2xl border bg-muted/20 p-5">
            <h2 className="font-bold">مۆدیولە پەیوەندیدارەکان</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {relatedLinks.map((link) => (
                <Link
                  key={link.slug}
                  href={`/dashboard/settings/docs/${link.slug}`}
                  className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold transition hover:border-[#FFAE42]/40 hover:text-[#FFAE42]"
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </footer>
        ) : null}

        <Link
          href="/dashboard/settings/docs"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#FFAE42] hover:underline"
        >
          <ChevronLeft size={16} />
          گەڕانەوە بۆ فێرکاری سیستەم
        </Link>
      </article>

      {/* Desktop TOC */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24 space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            ناوەڕۆکی لاپەڕە
          </p>
          <DocsToc
            module={mod}
            openSections={openSections}
            onJump={(key) => {
              setOpenSections((prev) => new Set([...prev, key]));
              document.getElementById(key)?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </div>
      </aside>
    </div>
  );
}

function DocsToc({
  module: mod,
  onJump,
}: {
  module: DocModule;
  openSections?: Set<DocSectionKey>;
  onJump: (key: DocSectionKey) => void;
}) {
  return (
    <ul className="space-y-1">
      {DOC_SECTION_ORDER.map((key) => (
        <li key={key}>
          <button
            type="button"
            onClick={() => onJump(key)}
            className="w-full rounded-lg px-2 py-1.5 text-start text-sm transition hover:bg-[#FFAE42]/10 hover:text-[#FFAE42]"
          >
            {mod.sections[key].title}
          </button>
        </li>
      ))}
    </ul>
  );
}
