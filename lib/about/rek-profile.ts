import type { LucideIcon } from "lucide-react";
import { Boxes, BriefcaseBusiness, Code2, HeartHandshake, Rocket, ShieldCheck, Target } from "lucide-react";

export type AboutSection = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  items?: string[];
};

/**
 * Public profile copy is intentionally kept in one editable, non-sensitive
 * configuration. Contact values remain unset until REK supplies them.
 */
export const REK_PROFILE = {
  hero: {
    eyebrow: "REK / RekApps",
    title: "دەربارەی ئێمە",
    description: "REK ERP پلاتفۆرمێکی ڕێکخراوە بۆ بەڕێوەبردنی کار و داتای ڕۆژانەی کۆمپانیاکانە.",
  },
  sections: [
    {
      id: "who-we-are",
      title: "دەربارەی ئێمە",
      description: "لە REK کار دەکەین لەسەر دروستکردنی ئەزموونێکی سادە، ڕوون و بەهێز بۆ بەڕێوەبردنی کارە بازرگانییەکان.",
      icon: HeartHandshake,
    },
    {
      id: "rek-erp",
      title: "دەربارەی REK ERP",
      description: "REK ERP بەشە سەرەکییەکانی وەک کۆگا، بەرهەم، فرۆشتن، کڕین، کڕیار، دابینکەر و کارمەند لە یەک شوێن کۆدەکاتەوە.",
      icon: Boxes,
    },
    {
      id: "capabilities",
      title: "تواناکانمان",
      description: "سیستەمەکە بۆ ڕێکخستنی داتا، چاودێری کردارەکان و یارمەتیدانی بڕیاردانی ڕۆژانە دیزاین کراوە.",
      icon: ShieldCheck,
      items: ["ڕێکخستنی کۆگا و بەرهەم", "بەڕێوەبردنی فرۆشتن و کڕین", "بەڕێوەبردنی کڕیار و دابینکەر", "بەڕێوەبردنی کارمەند و ڕاپۆرت"],
    },
    {
      id: "services",
      title: "خزمەتگوزارییەکانمان",
      description: "ئامانجمان پێشکەشکردنی ئامرازێکی باوەڕپێکراوە کە بتوانرێت لەگەڵ پێویستییەکانی کارەکەت بگونجێت.",
      icon: BriefcaseBusiness,
    },
    {
      id: "technology",
      title: "تەکنەلۆژیا و لێهاتووییەکانمان",
      description: "بە گرنگیدان بە پاراستنی داتا، جیاکردنەوەی کۆمپانیاکان و ئەزموونی بەکارهێنەر، سیستەمەکە بۆ کارکردنی ڕۆژانە پەرەپێدەدرێت.",
      icon: Code2,
    },
    {
      id: "mission-vision",
      title: "ئامانج و دیدگامان",
      description: "ئامانجمان ئەوەیە بەڕێوەبردنی کار بۆ تیمەکان سادەتر و ڕوونتر بێت؛ دیدگامان دروستکردنی بنچینەیەکی بەهێزە بۆ گەشەی دیجیتاڵ.",
      icon: Target,
    },
    {
      id: "why-rek",
      title: "بۆچی REK؟",
      description: "چونکە زانیاری و کردارە گرنگەکانت لە ناو یەک سیستەمی ڕێکخراو دەهێنێت، لەگەڵ دیزاینی گونجاو بۆ زمانی کوردی و ڕاست بۆ چەپ.",
      icon: Rocket,
    },
  ] satisfies AboutSection[],
  contact: {
    title: "پەیوەندی و تۆڕە کۆمەڵایەتییەکان",
    description: "بۆ پەیوەندی، پشتیوانی یان زانیاریی زیاتر، یەکێک لە ڕێگاکانی خوارەوە هەڵبژێرە.",
    phone: "07501173185",
    links: [
      { kind: "whatsapp", label: "WhatsApp", handle: "@rahandjaff", description: "گفتوگۆی ڕاستەوخۆ لە WhatsApp", href: "https://wa.me/9647501173185" },
      { kind: "telegram", label: "Telegram", handle: "@rahanddyy", description: "پڕۆفایلی Telegram", href: "https://t.me/rahanddyy" },
      { kind: "facebook", label: "Facebook", handle: "Rahand Mohammed", description: "پەیجی Facebook", href: "https://www.facebook.com/rahanddyy" },
      { kind: "messenger", label: "Messenger", handle: "Rahand Mohammed", description: "نامە لە Messenger", href: "https://m.me/rahanddyy" },
      { kind: "instagram", label: "Instagram", handle: "Rahand Lau", description: "ئەکاونتی شەخسی خاوەنی پڕۆژەی سیستەمی ڕێک", href: "https://www.instagram.com/rahandmjaff" },
      { kind: "instagram", label: "RekApps", handle: "RekApps", description: "پەیجی فەرمی سیستەمی RekApps", href: "https://www.instagram.com/rekapps" },
      { kind: "linkedin", label: "LinkedIn", handle: "Rahand Jaff", description: "پڕۆفایلی پیشەیی", href: "https://www.linkedin.com/in/rahandjaff" },
      { kind: "portfolio", label: "Portfolio", handle: "Rahand Jaff", description: "پۆرتفۆلیۆ", href: "https://rahandjaff.vercel.app" },
    ],
  },
} as const;
