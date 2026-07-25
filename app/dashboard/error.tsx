"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="rek-page-enter mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center"
    >
      <div className="mb-5 flex size-16 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
        <AlertTriangle size={28} aria-hidden />
      </div>
      <h1 className="text-2xl font-black text-foreground">
        هەڵەیەک ڕوویدا
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        نەتوانرا ئەم بەشە بار بکرێت. تکایە دووبارە هەوڵ بدەرەوە. ئەگەر
        بەردەوام بوو، پەیوەندی بە پشتگیری بکە.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground/80">
          کۆد: {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md shadow-[var(--shadow-brand)] transition hover:bg-[var(--brand-hover)] active:scale-[0.98]"
        >
          <RefreshCw size={16} aria-hidden />
          هەوڵی دووبارە
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-5 text-sm font-bold text-foreground transition hover:bg-muted active:scale-[0.98]"
        >
          <Home size={16} aria-hidden />
          داشبۆرد
        </Link>
      </div>
    </div>
  );
}
