"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { APP_GRID } from "@/lib/navigation/app-grid";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function GridLauncher({ open, onClose }: Props) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="داخستنی مێنیو"
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="مێنیوی ئەپەکان"
        className="absolute inset-x-3 top-[max(8%,env(safe-area-inset-top))] mx-auto max-h-[min(82vh,900px)] w-full max-w-3xl overflow-hidden rounded-[28px] border border-border bg-card text-card-foreground shadow-[0_30px_80px_var(--shadow-brand)] animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300 sm:inset-x-auto sm:left-1/2 sm:right-auto sm:w-[min(920px,92vw)] sm:-translate-x-1/2"
      >
        <div className="flex items-center justify-between border-b border-border bg-secondary px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-primary/70">
              {BRAND.nameEn}
            </p>
            <h2 className="text-xl font-black text-primary sm:text-2xl">
              مێنیوی سەرەکی · {BRAND.nameKu}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="داخستن"
            className="rounded-2xl border border-border bg-card p-2.5 text-primary transition hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/35"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="max-h-[calc(80vh-88px)] overflow-y-auto bg-card p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {APP_GRID.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "rek-grid-tile flex flex-col items-start gap-3 p-4 sm:p-5",
                    active && "border-primary bg-secondary shadow-lg"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-primary"
                    )}
                  >
                    <Icon size={22} aria-hidden />
                  </span>
                  <div>
                    <p className="font-bold text-foreground">{item.title}</p>
                    {item.description ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
