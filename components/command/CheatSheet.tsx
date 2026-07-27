"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  DEFAULT_BINDINGS,
  formatChordLabel,
  type ShortcutBinding,
} from "@/lib/command/keyboardPrefs";
import { useKeyboardProductivity } from "@/lib/command/keyboardProvider";
import { ALL_STATIC_COMMANDS } from "@/lib/command/commands";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/LocaleProvider";

export default function CheatSheetHost() {
  const { t } = useT();
  const {
    prefs,
    setBinding,
    resetBinding,
    disableBinding,
    labelFor,
  } = useKeyboardProductivity();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");

  const labels = useMemo(
    () =>
      ({
        "global-search": {
          title: t("command.openSmartSearch"),
          category: t("commandSheet.searching"),
        },
        "command-palette": {
          title: "پەلێتی فەرمان",
          category: t("nav.systemGroup"),
        },
        "cheat-sheet": {
          title: t("commandSheet.cheatSheet"),
          category: t("nav.systemGroup"),
        },
        "ai-assistant": {
          title: t("nav.aiAssistant"),
          category: t("nav.systemGroup"),
        },
        "create-new": {
          title: t("commandSheet.createNew"),
          category: t("common.create"),
        },
        "manual-save": {
          title: "پاشەکەوتی دەستی",
          category: t("commandSheet.editing"),
        },
        undo: { title: "پاشگەزبوونەوە", category: t("commandSheet.editing") },
        redo: {
          title: "دووبارەکردنەوە",
          category: t("commandSheet.editing"),
        },
        print: { title: "چاپکردن", category: t("nav.systemGroup") },
        "page-search": {
          title: "گەڕان لە پەڕەی ئێستا",
          category: t("commandSheet.searching"),
        },
        refresh: {
          title: t("commandSheet.refreshModule"),
          category: t("nav.systemGroup"),
        },
        duplicate: {
          title: "دووبارەکردنەوەی تۆمار",
          category: t("commandSheet.editing"),
        },
        "delete-selected": {
          title: t("commandSheet.deleteSelected"),
          category: t("commandSheet.editing"),
        },
        "nav-1": { title: t("nav.dashboard"), category: "گەشتکردن" },
        "nav-2": { title: t("nav.products"), category: "گەشتکردن" },
        "nav-3": { title: t("nav.sales"), category: "گەشتکردن" },
        "nav-4": { title: t("nav.purchases"), category: "گەشتکردن" },
        "nav-5": { title: t("nav.inventory"), category: "گەشتکردن" },
        "nav-6": { title: t("nav.customers"), category: "گەشتکردن" },
        "nav-7": { title: t("nav.suppliers"), category: "گەشتکردن" },
        "nav-8": { title: t("nav.reports"), category: "گەشتکردن" },
        "nav-9": { title: t("nav.settings"), category: "گەشتکردن" },
      }) as Record<string, { title: string; category: string }>,
    [t]
  );

  useEffect(() => {
    function openSheet() {
      setOpen(true);
    }
    function toggle() {
      setOpen((v) => !v);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !recordingId) {
        setOpen(false);
      }
    }
    window.addEventListener("rek:cheat-sheet-open", openSheet);
    window.addEventListener("rek:cheat-sheet-toggle", toggle);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("rek:cheat-sheet-open", openSheet);
      window.removeEventListener("rek:cheat-sheet-toggle", toggle);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, recordingId]);

  useEffect(() => {
    if (!open || !recordingId) return;
    function onKey(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecordingId(null);
        return;
      }
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      let key = e.key;
      if (key.length === 1) key = key.toUpperCase();
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;
      parts.push(key);
      const chord = parts.join("+");
      const result = setBinding(recordingId!, chord);
      if (!result.ok) {
        appToast.error(
          t("commandSheet.conflictWith", { list: result.conflicts.join(", ") })
        );
      } else {
        appToast.success(t("commandSheet.shortcutUpdated"));
        setRecordingId(null);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, recordingId, setBinding, t]);

  const rows = useMemo(() => {
    const all = {
      ...DEFAULT_BINDINGS,
      ...prefs.bindings,
    } as Record<string, ShortcutBinding>;
    const q = query.trim().toLowerCase();
    return Object.entries(all)
      .map(([id, binding]) => {
        const meta = labels[id] || {
          title: id,
          category: t("nav.systemGroup"),
        };
        const cmd = ALL_STATIC_COMMANDS.find((c) => c.shortcutId === id);
        return {
          id,
          title: cmd?.title || meta.title,
          description: cmd?.description || cmd?.subtitle || "",
          category: cmd?.category || meta.category,
          keys: binding.keys,
          disabled: Boolean(binding.disabled),
          label: labelFor(id) || formatChordLabel(binding.keys),
        };
      })
      .filter((r) => {
        if (category !== "all" && r.category !== category) return false;
        if (!q) return true;
        return (
          r.title.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.keys.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category) || a.title.localeCompare(b.title)
      );
  }, [prefs.bindings, query, category, labelFor, labels, t]);

  const categories = useMemo(() => {
    const set = new Set(Object.values(labels).map((l) => l.category));
    ALL_STATIC_COMMANDS.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return ["all", ...[...set].sort()];
  }, [labels]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-start justify-center px-3 pt-[8vh]"
      role="dialog"
      aria-modal="true"
      aria-label="قەدبڕەکانی تەختەکلیل"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]"
        aria-label={t("commandSheet.closeSheet")}
        onClick={() => setOpen(false)}
      />
      <div className="relative z-10 flex max-h-[min(80vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-black">
            {t("commandSheet.keyboardShortcuts")}
          </h2>
          <kbd className="rek-cmd-kbd">Ctrl+/</kbd>
          <button
            type="button"
            className="ms-auto rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            onClick={() => setOpen(false)}
            aria-label={t("common.close")}
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 border-b border-border px-4 py-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 start-2.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="گەڕان لە قەدبڕەکان…"
              className="h-9 w-full rounded-xl border-0 bg-muted/70 pe-3 ps-8 text-sm outline-none"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-xl border-0 bg-muted/70 px-2 text-xs font-bold"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "هەموو پۆلەکان" : c}
              </option>
            ))}
          </select>
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60",
                r.disabled && "opacity-50"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{r.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {r.category}
                  {r.description ? ` · ${r.description}` : ""}
                </p>
              </div>
              <kbd className="rek-cmd-kbd shrink-0">
                {recordingId === r.id ? t("commandSheet.pressKeys") : r.label}
              </kbd>
              <button
                type="button"
                className="text-[10px] font-bold text-primary"
                onClick={() =>
                  setRecordingId((id) => (id === r.id ? null : r.id))
                }
              >
                {t("commandSheet.change")}
              </button>
              <button
                type="button"
                className="text-[10px] font-bold text-muted-foreground"
                onClick={() => resetBinding(r.id)}
              >
                {t("commandSheet.reset")}
              </button>
              <button
                type="button"
                className="text-[10px] font-bold text-muted-foreground"
                onClick={() => disableBinding(r.id, !r.disabled)}
              >
                {r.disabled ? "چالاککردن" : "ناچالاککردن"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
