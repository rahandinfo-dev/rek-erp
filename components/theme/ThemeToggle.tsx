"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "گۆڕین بۆ ڕووناک" : "گۆڕین بۆ تاریک"}
      title={isDark ? "Light" : "Dark"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-[var(--icon)] shadow-sm transition hover:bg-secondary hover:text-primary"
    >
      {isDark ? (
        <Sun size={18} strokeWidth={2.25} aria-hidden />
      ) : (
        <Moon size={18} strokeWidth={2.25} aria-hidden />
      )}
    </button>
  );
}
