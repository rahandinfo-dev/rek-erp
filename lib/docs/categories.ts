import type { DocCategory } from "@/lib/docs/types";

export const DOC_CATEGORIES: DocCategory[] = [
  {
    id: "start",
    title: "دەستپێکردن",
    description: "داشبۆرد، کۆمپانیا، بەکارهێنەر، پرۆفایل و دراو",
    order: 1,
  },
  {
    id: "inventory",
    title: "کاڵا و کۆگا",
    description: "ئینڤێنتۆری، بەرهەم، کۆگا، یەکە و بارکۆد",
    order: 2,
  },
  {
    id: "trading",
    title: "بازرگانی",
    description: "فرۆشتن، کڕین، کڕیار، دابینکەر و پسووڵە",
    order: 3,
  },
  {
    id: "people",
    title: "کارمەندان",
    description: "تۆماری کارمەند و ڕاپۆرتی کارمەندان",
    order: 4,
  },
  {
    id: "insights",
    title: "شیکاری و ڕاپۆرت",
    description: "شیکاری، ڕاپۆرت، تێرمیناڵی چالاکی و چاودێری",
    order: 5,
  },
  {
    id: "ai",
    title: "ژیرایی و ئاگاداری",
    description: "یاریدەدەری زیرەکی سیستەمی ڕێک و ناوەندی ئاگاداری",
    order: 6,
  },
  {
    id: "system",
    title: "سیستەم و پاراستن",
    description:
      "ڕێکخستن، ژمارەدان، گەڕاندنەوە، ڕەشنووس، سەبەتەی زبڵ و ئامرازەکان",
    order: 7,
  },
];

export function getCategoryById(id: string) {
  return DOC_CATEGORIES.find((c) => c.id === id);
}
