"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[REK]", error);
  }, [error]);

  return (
    <html lang="ckb" dir="rtl">
      <body className="bg-background text-foreground antialiased">
        <div
          role="alert"
          className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 text-center"
        >
          <div className="mb-5 flex size-16 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
            <AlertTriangle size={28} aria-hidden />
          </div>
          <h1 className="text-2xl font-black">هەڵەی گشتی</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ئەپەکە تووشی کێشەیەک بوو. تکایە پەڕەکە نوێ بکەرەوە.
          </p>
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            کۆدی بەدواداچوون: {error.digest || "CLIENT-GLOBAL"}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground"
            >
              <RefreshCw size={16} aria-hidden />
              هەوڵی دووبارە
            </button>
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-5 text-sm font-bold"
            >
              <Home size={16} aria-hidden />
              سەرەتا
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
