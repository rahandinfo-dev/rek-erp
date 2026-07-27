import type { DocCategory } from "@/lib/docs/types";

export const DOC_CATEGORIES: DocCategory[] = [
  {
    id: "start",
    title: "دەستپێکردن",
    description: "داشبۆرد، کۆمپانیا، پرۆفایل و بنەڕەتەکانی سیستەم",
    order: 1,
  },
  {
    id: "inventory",
    title: "کاڵا و کۆگا",
    description: "بەرهەم، پۆل، کۆگا، یەکە، بارکۆد و بەڕێوەبردنی ئینڤێنتۆری",
    order: 2,
  },
  {
    id: "trading",
    title: "بازرگانی",
    description: "فرۆشتن، کڕین، کڕیار، دابینکەر و پسوولە",
    order: 3,
  },
  {
    id: "finance",
    title: "دارایی",
    description: "داهات، خەرجی، پارەدان و شیکاری دارایی",
    order: 4,
  },
  {
    id: "people",
    title: "کارمەندان",
    description: "تۆمارکردن، مووچە، دەوام و ڕاپۆرتی کارمەند",
    order: 5,
  },
  {
    id: "insights",
    title: "شیکاری و ڕاپۆرت",
    description: "شیکاری، ڕاپۆرت، چالاکی و تۆماری وردبینی",
    order: 6,
  },
  {
    id: "ai",
    title: "ژیرایی و ئاگاداری",
    description: "یاریدەدەری زیرەک و ناوەندی ئاگادارییەکان",
    order: 7,
  },
  {
    id: "system",
    title: "سیستەم و پاراستن",
    description: "ڕێکخستن، ژمارەدان، وێنە، پشتگیری داتا و پاراستن",
    order: 8,
  },
];

export function getCategoryById(id: string) {
  return DOC_CATEGORIES.find((c) => c.id === id);
}
