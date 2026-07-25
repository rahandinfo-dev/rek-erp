import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="rek-page-enter mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-3xl bg-secondary text-primary">
        <FileQuestion size={28} aria-hidden />
      </div>
      <p className="text-sm font-bold text-primary">٤٠٤</p>
      <h1 className="mt-1 text-2xl font-black text-foreground">
        ئەم بەشە نەدۆزرایەوە
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        لەوانەیە بەستەرەکە هەڵە بێت یان مافت نەبێت بۆ بینینی.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-[var(--brand-hover)]"
      >
        <Home size={16} aria-hidden />
        گەڕانەوە بۆ داشبۆرد
      </Link>
    </div>
  );
}
