/** Kurdish Sorani copy for the unified image upload system */

export const uploadMessages = {
  dropHint: "فایل ڕاکێشە بۆ ئێرە یان کرتە بکە بۆ هەڵبژاردن",
  replace: "گۆڕینی وێنە",
  delete: "سڕینەوەی وێنە",
  uploading: "بارکردن…",
  compressing: "پەستاندنی وێنە…",
  success: "وێنە بە سەرکەوتوویی بارکرا.",
  deleted: "وێنە سڕایەوە.",
  preview: "پێشبینین",
  empty: "هیچ وێنەیەک نییە",
  types: "PNG · JPG · WEBP · GIF",
  maxSize: "زۆرینە ٥ مێگابایت",
  errors: {
    unauthorized: "تکایە سەرەتا بچۆ ژوورەوە.",
    required: "فایل پێویستە.",
    tooLarge: "قەبارەی فایل زۆر گەورەیە (زۆرینە ٥MB).",
    badType: "جۆری فایل ڕێگەپێنەدراوە. تەنها PNG، JPEG، WEBP یان GIF.",
    failed: "بارکردنی وێنە سەرنەکەوت.",
    deleteFailed: "سڕینەوەی وێنە سەرنەکەوت.",
    network: "هەڵەیەک ڕوویدا. پەیوەندی تۆڕ بپشکنە.",
    invalidKind: "جۆری بارکردن نادروستە.",
  },
} as const;
