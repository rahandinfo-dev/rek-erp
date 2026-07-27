"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Construction,
  ExternalLink,
  HelpCircle,
  Info,
  Lightbulb,
  List,
  ListOrdered,
  Link2,
  NotebookPen,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { getCategoryById } from "@/lib/docs/categories";
import {
  DOC_SECTION_ORDER,
  DOC_SECTION_VARIANT,
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
  const [openSections, setOpenSections] = useState<Set<DocSectionKey>>(
    () => new Set(DOC_SECTION_ORDER)
  );
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
      .flatMap((line) => line.split(/[،,·|]/))
      .map((s) => s.trim().replace(/^[-•]\s*/, ""))
      .filter(Boolean)
      .map((title) => {
        const found = allSlugs.find(
          (s) =>
            s.title === title ||
            s.title.includes(title) ||
            title.includes(s.title)
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
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start" dir="rtl">
      <article className="min-w-0 flex-1 space-y-6">
        <nav aria-label="breadcrumb" className="text-sm">
          <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
            <li>
              <Link
                href="/dashboard/settings"
                className="font-semibold hover:text-[#FFAE42]"
              >
                ڕێکخستن
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

        <header className="border border-[#FFAE42]/25 bg-gradient-to-br from-[#FFAE42]/8 via-white to-amber-50/40 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center bg-[#FFAE42]/15 text-[#FFAE42]">
                <Icon size={28} aria-hidden />
              </div>
              <div>
                {category ? (
                  <p className="text-xs font-bold text-[#FFAE42]">
                    {category.title}
                  </p>
                ) : null}
                <h1 className="text-2xl font-black text-[#FFAE42] sm:text-3xl lg:text-4xl">
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
                className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#FFAE42] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#e89d35]"
              >
                <ExternalLink size={16} aria-hidden />
                کردنەوەی بەش
              </Link>
            ) : null}
          </div>

          {mod.underDevelopment && mod.developmentNote ? (
            <div className="mt-4 flex gap-3 border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
              <Construction
                className="mt-0.5 shrink-0 text-amber-600"
                size={18}
                aria-hidden
              />
              <div>
                <p className="font-bold">تێبینی گەشەپێدان</p>
                <p className="mt-1">{mod.developmentNote}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <InfoStat
              icon={<BookOpen size={16} />}
              label="جۆری بەڵگەنامە"
              value="ڕێنمایی فەرمی ERP"
            />
            <InfoStat
              icon={<ListOrdered size={16} />}
              label="بەشەکان"
              value={`${DOC_SECTION_ORDER.length} بەش`}
            />
            <InfoStat
              icon={<Sparkles size={16} />}
              label="زمان"
              value="کوردی سۆرانی"
            />
          </div>
        </header>

        <button
          type="button"
          onClick={() => setTocOpen((v) => !v)}
          className="flex w-full items-center justify-between border bg-muted/40 px-4 py-3 text-sm font-bold lg:hidden"
        >
          <span className="inline-flex items-center gap-2">
            <List size={18} aria-hidden />
            ناوەڕۆکی لاپەڕە
          </span>
          <ChevronDown
            size={18}
            className={cn("transition", tocOpen && "rotate-180")}
            aria-hidden
          />
        </button>

        {tocOpen ? (
          <div className="border bg-white p-4 lg:hidden">
            <DocsToc
              module={mod}
              onJump={(key) => {
                setOpenSections((prev) => new Set([...prev, key]));
                setTocOpen(false);
                window.setTimeout(() => {
                  document
                    .getElementById(key)
                    ?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="border px-3 py-1.5 text-xs font-bold hover:bg-muted"
          >
            کردنەوەی هەموو
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="border px-3 py-1.5 text-xs font-bold hover:bg-muted"
          >
            داخستنی هەموو
          </button>
        </div>

        <div className="space-y-4">
          {DOC_SECTION_ORDER.map((key, index) => {
            const section = mod.sections[key];
            const isOpen = openSections.has(key);
            const variant = DOC_SECTION_VARIANT[key];
            return (
              <section
                key={key}
                id={key}
                className="scroll-mt-24 overflow-hidden border bg-card shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start transition hover:bg-muted/40"
                  aria-expanded={isOpen}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center bg-[#FFAE42]/12 text-xs font-black text-[#FFAE42]">
                      {index + 1}
                    </span>
                    <span className="font-black text-foreground">
                      {section.title}
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={cn(
                      "shrink-0 text-muted-foreground transition-transform duration-300",
                      isOpen && "rotate-180"
                    )}
                    aria-hidden
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="border-t px-5 py-5">
                      <SectionBody
                        variant={variant}
                        body={section.body}
                        relatedLinks={
                          key === "related" ? relatedLinks : undefined
                        }
                      />
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <Link
          href="/dashboard/settings/docs"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#FFAE42] hover:underline"
        >
          <ChevronLeft size={16} aria-hidden />
          گەڕانەوە بۆ فێرکاری سیستەم
        </Link>
      </article>

      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-24 space-y-4 border bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground">
            ناوەڕۆکی لاپەڕە
          </p>
          <DocsToc
            module={mod}
            onJump={(key) => {
              setOpenSections((prev) => new Set([...prev, key]));
              document
                .getElementById(key)
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </div>
      </aside>
    </div>
  );
}

function InfoStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-[#FFAE42]/15 bg-white/80 px-3 py-2.5">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
        <span className="text-[#FFAE42]">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function DocsToc({
  module: mod,
  onJump,
}: {
  module: DocModule;
  onJump: (key: DocSectionKey) => void;
}) {
  return (
    <ul className="space-y-1">
      {DOC_SECTION_ORDER.map((key, i) => (
        <li key={key}>
          <button
            type="button"
            onClick={() => onJump(key)}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-start text-sm transition hover:bg-[#FFAE42]/10 hover:text-[#FFAE42]"
          >
            <span className="text-[10px] font-black text-[#FFAE42]/80">
              {i + 1}
            </span>
            <span className="leading-snug">{mod.sections[key].title}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function SectionBody({
  variant,
  body,
  relatedLinks,
}: {
  variant: (typeof DOC_SECTION_VARIANT)[DocSectionKey];
  body: string[];
  relatedLinks?: { title: string; slug: string }[];
}) {
  if (variant === "steps") {
    return (
      <ol className="space-y-3">
        {body.map((line, i) => {
          const text = line.replace(/^STEP:\s*/i, "").trim();
          return (
            <li
              key={i}
              className="flex gap-3 border border-[#FFAE42]/15 bg-[#FFAE42]/5 p-3"
            >
              <span className="flex size-8 shrink-0 items-center justify-center bg-[#FFAE42] text-sm font-black text-white">
                {i + 1}
              </span>
              <p className="pt-1 text-sm leading-relaxed text-slate-700">
                {text}
              </p>
            </li>
          );
        })}
      </ol>
    );
  }

  if (variant === "danger") {
    return (
      <Callout
        tone="danger"
        icon={<ShieldAlert size={18} />}
        title="ئاگاداری — هەڵە باوەکان"
      >
        <BulletList items={body} />
      </Callout>
    );
  }

  if (variant === "warning") {
    return (
      <Callout
        tone="warning"
        icon={<AlertTriangle size={18} />}
        title="چارەسەری کێشەکان"
      >
        <BulletList items={body} />
      </Callout>
    );
  }

  if (variant === "tip") {
    return (
      <Callout
        tone="tip"
        icon={<Lightbulb size={18} />}
        title="ئامۆژگاری پیشەیی"
      >
        <BulletList items={body} />
      </Callout>
    );
  }

  if (variant === "success") {
    return (
      <Callout
        tone="success"
        icon={<CheckCircle2 size={18} />}
        title="باشترین ڕێگا"
      >
        <BulletList items={body} />
      </Callout>
    );
  }

  if (variant === "faq") {
    return (
      <div className="space-y-3">
        {body.map((line, i) => {
          const parts = line.split(/\s*[—–-]\s*/);
          const q = parts[0]?.trim();
          const a = parts.slice(1).join(" — ").trim();
          return (
            <div key={i} className="border border-border bg-muted/20 p-4">
              <p className="inline-flex items-start gap-2 text-sm font-black text-foreground">
                <HelpCircle
                  size={16}
                  className="mt-0.5 shrink-0 text-[#FFAE42]"
                  aria-hidden
                />
                {q}
              </p>
              {a ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{a}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === "related") {
    return (
      <div className="space-y-4">
        <Callout
          tone="info"
          icon={<Link2 size={18} />}
          title="پەیوەندی لەگەڵ بەشەکانی دیکە"
        >
          <BulletList items={body} />
        </Callout>
        {relatedLinks && relatedLinks.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {relatedLinks.map((link) => (
              <Link
                key={link.slug}
                href={`/dashboard/settings/docs/${link.slug}`}
                className="border bg-white px-3 py-2 text-sm font-semibold transition hover:border-[#FFAE42]/40 hover:text-[#FFAE42]"
              >
                {link.title}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (variant === "summary") {
    return (
      <Callout
        tone="summary"
        icon={<NotebookPen size={18} />}
        title="کورتە پوختە"
      >
        <div className="space-y-2">
          {body.map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-slate-800">
              {line}
            </p>
          ))}
        </div>
      </Callout>
    );
  }

  if (variant === "example") {
    return (
      <Callout
        tone="example"
        icon={<Sparkles size={18} />}
        title="نموونەی ڕاستەقینەی کار"
      >
        <BulletList items={body} />
      </Callout>
    );
  }

  if (variant === "info") {
    return (
      <Callout tone="info" icon={<Info size={18} />} title="زانیاری">
        <div className="space-y-2">
          {body.map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-slate-700">
              {line}
            </p>
          ))}
        </div>
      </Callout>
    );
  }

  return (
    <div className="space-y-2">
      {body.map((line, i) => (
        <p key={i} className="text-sm leading-relaxed text-slate-700">
          {line}
        </p>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="relative ps-4 text-sm leading-relaxed text-slate-700 before:absolute before:start-0 before:top-2 before:size-1.5 before:bg-[#FFAE42]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function Callout({
  tone,
  icon,
  title,
  children,
}: {
  tone:
    | "info"
    | "success"
    | "warning"
    | "danger"
    | "tip"
    | "example"
    | "summary";
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  const styles: Record<typeof tone, string> = {
    info: "border-[#FFAE42]/25 bg-[#FFAE42]/5",
    success: "border-emerald-200 bg-emerald-50",
    warning: "border-amber-300 bg-amber-50",
    danger: "border-red-200 bg-red-50",
    tip: "border-sky-200 bg-sky-50",
    example: "border-violet-200 bg-violet-50",
    summary: "border-slate-300 bg-slate-50",
  };
  const iconStyles: Record<typeof tone, string> = {
    info: "text-[#FFAE42]",
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-red-700",
    tip: "text-sky-700",
    example: "text-violet-700",
    summary: "text-slate-700",
  };

  return (
    <div className={cn("border p-4", styles[tone])}>
      <p
        className={cn(
          "mb-3 inline-flex items-center gap-2 text-sm font-black",
          iconStyles[tone]
        )}
      >
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}
