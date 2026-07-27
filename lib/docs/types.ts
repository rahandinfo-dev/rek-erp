import type { LucideIcon } from "lucide-react";

export type DocCategoryId =
  | "start"
  | "inventory"
  | "trading"
  | "people"
  | "insights"
  | "ai"
  | "system";

export type DocCategory = {
  id: DocCategoryId;
  title: string;
  description: string;
  order: number;
};

/** Official Learning Center manual sections (order matters). */
export type DocSectionKey =
  | "overview"
  | "purpose"
  | "whenToUse"
  | "steps"
  | "workflow"
  | "bestPractices"
  | "commonMistakes"
  | "troubleshooting"
  | "tips"
  | "faq"
  | "related"
  | "summary";

export type DocSection = {
  id: DocSectionKey;
  title: string;
  /** Paragraphs, bullets, or special lines (STEP:, WARN:, TIP:, NOTE:, TABLE:) */
  body: string[];
};

export type DocModule = {
  slug: string;
  title: string;
  shortDescription: string;
  categoryId: DocCategoryId;
  icon: LucideIcon;
  appRoute?: string;
  underDevelopment?: boolean;
  developmentNote?: string;
  keywords: string[];
  sections: Record<DocSectionKey, DocSection>;
};

export const DOC_SECTION_LABELS: Record<DocSectionKey, string> = {
  overview: "دەربارەی ئەم بەشە",
  purpose: "ئامانجی ئەم بەشە",
  whenToUse: "کەی بەکاری دەهێنیت؟",
  steps: "چۆن بەکاریبهێنم؟",
  workflow: "نموونەی ڕاستەقینە",
  bestPractices: "باشترین ڕێگاکانی بەکارهێنان",
  commonMistakes: "هەڵە باوەکان",
  troubleshooting: "چارەسەری کێشەکان",
  tips: "ئامۆژگارییەکان",
  faq: "پرسیارە باوەکان",
  related: "پەیوەندی بەشەکان",
  summary: "کورتە پوختە",
};

export const DOC_SECTION_ORDER: DocSectionKey[] = [
  "overview",
  "purpose",
  "whenToUse",
  "steps",
  "workflow",
  "bestPractices",
  "commonMistakes",
  "troubleshooting",
  "tips",
  "faq",
  "related",
  "summary",
];

/** Visual presentation hint for DocsModuleView */
export const DOC_SECTION_VARIANT: Record<
  DocSectionKey,
  "default" | "info" | "steps" | "example" | "success" | "warning" | "danger" | "tip" | "faq" | "related" | "summary"
> = {
  overview: "info",
  purpose: "info",
  whenToUse: "default",
  steps: "steps",
  workflow: "example",
  bestPractices: "success",
  commonMistakes: "danger",
  troubleshooting: "warning",
  tips: "tip",
  faq: "faq",
  related: "related",
  summary: "summary",
};
