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

const LABELS: Record<string, { title: string; category: string }> = {
  "global-search": { title: "Global Search", category: "Searching" },
  "command-palette": { title: "Command Palette", category: "System" },
  "cheat-sheet": { title: "Shortcut Cheat Sheet", category: "System" },
  "ai-assistant": { title: "AI Assistant", category: "System" },
  "create-new": { title: "Create New Record", category: "Creation" },
  "manual-save": { title: "Manual Save", category: "Editing" },
  undo: { title: "Undo", category: "Editing" },
  redo: { title: "Redo", category: "Editing" },
  print: { title: "Print", category: "System" },
  "page-search": { title: "Search Current Page", category: "Searching" },
  refresh: { title: "Refresh Module", category: "System" },
  duplicate: { title: "Duplicate Record", category: "Editing" },
  "delete-selected": { title: "Delete Selected", category: "Editing" },
  "nav-1": { title: "Dashboard", category: "Navigation" },
  "nav-2": { title: "Products", category: "Navigation" },
  "nav-3": { title: "Sales", category: "Navigation" },
  "nav-4": { title: "Purchases", category: "Navigation" },
  "nav-5": { title: "Inventory", category: "Navigation" },
  "nav-6": { title: "Customers", category: "Navigation" },
  "nav-7": { title: "Suppliers", category: "Navigation" },
  "nav-8": { title: "Reports", category: "Navigation" },
  "nav-9": { title: "Settings", category: "Navigation" },
};

export default function CheatSheetHost() {
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
        appToast.error(`Conflict with: ${result.conflicts.join(", ")}`);
      } else {
        appToast.success("Shortcut updated");
        setRecordingId(null);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, recordingId, setBinding]);

  const rows = useMemo(() => {
    const all = {
      ...DEFAULT_BINDINGS,
      ...prefs.bindings,
    } as Record<string, ShortcutBinding>;
    const q = query.trim().toLowerCase();
    return Object.entries(all)
      .map(([id, binding]) => {
        const meta = LABELS[id] || {
          title: id,
          category: "System",
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
      .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
  }, [prefs.bindings, query, category, labelFor]);

  const categories = useMemo(() => {
    const set = new Set(Object.values(LABELS).map((l) => l.category));
    ALL_STATIC_COMMANDS.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return ["all", ...[...set].sort()];
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-start justify-center px-3 pt-[8vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]"
        aria-label="Close cheat sheet"
        onClick={() => setOpen(false)}
      />
      <div className="relative z-10 flex max-h-[min(80vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-black">Keyboard Shortcuts</h2>
          <kbd className="rek-cmd-kbd">Ctrl+/</kbd>
          <button
            type="button"
            className="ms-auto rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            onClick={() => setOpen(false)}
            aria-label="Close"
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
              placeholder="Search shortcuts…"
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
                {c === "all" ? "All categories" : c}
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
                {recordingId === r.id ? "Press keys…" : r.label}
              </kbd>
              <button
                type="button"
                className="text-[10px] font-bold text-primary"
                onClick={() =>
                  setRecordingId((id) => (id === r.id ? null : r.id))
                }
              >
                Change
              </button>
              <button
                type="button"
                className="text-[10px] font-bold text-muted-foreground"
                onClick={() => resetBinding(r.id)}
              >
                Reset
              </button>
              <button
                type="button"
                className="text-[10px] font-bold text-muted-foreground"
                onClick={() => disableBinding(r.id, !r.disabled)}
              >
                {r.disabled ? "Enable" : "Disable"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
