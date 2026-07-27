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

export type DocSectionKey =
  | "overview"
  | "purpose"
  | "whyExists"
  | "whenToUse"
  | "steps"
  | "workflow"
  | "bestPractices"
  | "commonMistakes"
  | "tips"
  | "faq"
  | "troubleshooting"
  | "related";

export type DocSection = {
  id: DocSectionKey;
  title: string;
  /** Paragraphs or bullet lines */
  body: string[];
};

export type DocModule = {
  slug: string;
  title: string;
  shortDescription: string;
  categoryId: DocCategoryId;
  icon: LucideIcon;
  /** In-app route when the module exists */
  appRoute?: string;
  /** Feature is partial or not yet a standalone module */
  underDevelopment?: boolean;
  developmentNote?: string;
  keywords: string[];
  sections: Record<DocSectionKey, DocSection>;
};

export const DOC_SECTION_LABELS: Record<DocSectionKey, string> = {
  overview: "پوختەی مۆدیول",
  purpose: "ئامانج",
  whyExists: "بۆچی پێویستە",
  whenToUse: "کەی بەکاری بهێنیت",
  steps: "هەنگاو بە هەنگاو",
  workflow: "نموونەی کارکردنی ڕاستەقینە",
  bestPractices: "باشترین ڕێکارەکان",
  commonMistakes: "هەڵە باوەکان",
  tips: "ئامۆژگاری و پێشنیار",
  faq: "پرسیارە باوەکان",
  troubleshooting: "چارەسەری کێشەکان",
  related: "مۆدیولە پەیوەندیدارەکان",
};

export const DOC_SECTION_ORDER: DocSectionKey[] = [
  "overview",
  "purpose",
  "whyExists",
  "whenToUse",
  "steps",
  "workflow",
  "bestPractices",
  "commonMistakes",
  "tips",
  "faq",
  "troubleshooting",
  "related",
];
