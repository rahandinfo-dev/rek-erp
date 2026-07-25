"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { isEditableTarget } from "@/lib/undo/types";
import {
  DEFAULT_BINDINGS,
  NAV_SLOT_HREFS,
  chordsEqual,
  emptyKeyboardPrefs,
  eventToChord,
  findShortcutConflicts,
  formatChordLabel,
  resolveBinding,
  type KeyboardPrefs,
  type ShortcutBinding,
} from "@/lib/command/keyboardPrefs";
import {
  ensureLocalKeyboardPrefs,
  writeLocalKeyboardPrefs,
} from "@/lib/command/keyboardStorage";
import {
  fetchKeyboardPrefs,
  syncKeyboardPrefs,
} from "@/lib/command/keyboardSync";
import {
  openCheatSheet,
  openCommandPalette,
  toggleCheatSheet,
} from "@/lib/command/bus";
import { toggleAiAssistant } from "@/lib/ai/bus";
import { ALL_STATIC_COMMANDS } from "@/lib/command/commands";
import { pushCommandRecent } from "@/lib/command/recents";

type Ctx = {
  ready: boolean;
  prefs: KeyboardPrefs;
  labelFor: (shortcutId: string) => string | undefined;
  setBinding: (
    shortcutId: string,
    keys: string
  ) => { ok: boolean; conflicts: string[] };
  resetBinding: (shortcutId: string) => void;
  disableBinding: (shortcutId: string, disabled: boolean) => void;
  toggleFavoriteCommand: (commandId: string) => void;
  isFavoriteCommand: (commandId: string) => boolean;
  pushHistory: (commandId: string) => void;
  refresh: () => Promise<void>;
};

const KeyboardContext = createContext<Ctx | null>(null);

export function KeyboardProductivityProvider({
  userId,
  companyId,
  children,
}: {
  userId: string;
  companyId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/dashboard";
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState<KeyboardPrefs>(() =>
    emptyKeyboardPrefs(userId, companyId)
  );
  const syncTimer = useRef<number | undefined>(undefined);

  const persist = useCallback(
    (next: KeyboardPrefs, sync = true) => {
      const stamped = {
        ...next,
        userId,
        companyId,
        updatedAt: Date.now(),
      };
      setPrefs(stamped);
      writeLocalKeyboardPrefs(stamped);
      if (!sync) return;
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => {
        void syncKeyboardPrefs(stamped).then((remote) => {
          if (remote) {
            writeLocalKeyboardPrefs(remote);
            setPrefs(remote);
          }
        });
      }, 400);
    },
    [userId, companyId]
  );

  const refresh = useCallback(async () => {
    const local = ensureLocalKeyboardPrefs(userId, companyId);
    let remote: KeyboardPrefs | null = null;
    if (navigator.onLine) remote = await fetchKeyboardPrefs();
    const best =
      remote && remote.updatedAt >= local.updatedAt ? remote : local;
    persist(best, false);
  }, [userId, companyId, persist]);

  useEffect(() => {
    if (!userId) return;
    const t = window.setTimeout(() => {
      void refresh().finally(() => setReady(true));
    }, 0);
    return () => window.clearTimeout(t);
  }, [userId, refresh]);

  useEffect(() => {
    function onOnline() {
      void refresh();
      const local = ensureLocalKeyboardPrefs(userId, companyId);
      void syncKeyboardPrefs(local);
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [userId, companyId, refresh]);

  const labelFor = useCallback(
    (shortcutId: string) => {
      const b = resolveBinding(prefs, shortcutId);
      if (!b || b.disabled) return undefined;
      return formatChordLabel(b.keys);
    },
    [prefs]
  );

  const setBinding = useCallback(
    (shortcutId: string, keys: string) => {
      const conflicts = findShortcutConflicts(prefs, shortcutId, keys);
      if (conflicts.length) return { ok: false, conflicts };
      persist({
        ...prefs,
        bindings: {
          ...prefs.bindings,
          [shortcutId]: { keys, disabled: false },
        },
      });
      return { ok: true, conflicts: [] as string[] };
    },
    [prefs, persist]
  );

  const resetBinding = useCallback(
    (shortcutId: string) => {
      const next = { ...prefs.bindings };
      if (DEFAULT_BINDINGS[shortcutId]) {
        next[shortcutId] = { ...DEFAULT_BINDINGS[shortcutId] };
      } else {
        delete next[shortcutId];
      }
      persist({ ...prefs, bindings: next });
    },
    [prefs, persist]
  );

  const disableBinding = useCallback(
    (shortcutId: string, disabled: boolean) => {
      const prev = resolveBinding(prefs, shortcutId) || { keys: "" };
      persist({
        ...prefs,
        bindings: {
          ...prefs.bindings,
          [shortcutId]: { ...prev, disabled },
        },
      });
    },
    [prefs, persist]
  );

  const toggleFavoriteCommand = useCallback(
    (commandId: string) => {
      const has = prefs.favoriteCommandIds.includes(commandId);
      persist({
        ...prefs,
        favoriteCommandIds: has
          ? prefs.favoriteCommandIds.filter((id) => id !== commandId)
          : [commandId, ...prefs.favoriteCommandIds].slice(0, 50),
      });
    },
    [prefs, persist]
  );

  const isFavoriteCommand = useCallback(
    (commandId: string) => prefs.favoriteCommandIds.includes(commandId),
    [prefs.favoriteCommandIds]
  );

  const pushHistory = useCallback(
    (commandId: string) => {
      const cmd = ALL_STATIC_COMMANDS.find((c) => c.id === commandId);
      if (cmd) pushCommandRecent(cmd, userId);
      persist({
        ...prefs,
        commandHistory: [
          { id: commandId, at: Date.now() },
          ...prefs.commandHistory.filter((h) => h.id !== commandId),
        ].slice(0, 30),
      });
    },
    [prefs, persist, userId]
  );

  const runShortcutAction = useCallback(
    (shortcutId: string) => {
      switch (shortcutId) {
        case "global-search":
          openCommandPalette("search");
          return;
        case "command-palette":
          openCommandPalette("commands");
          return;
        case "cheat-sheet":
          toggleCheatSheet();
          return;
        case "ai-assistant":
          toggleAiAssistant();
          return;
        case "create-new": {
          if (pathname.includes("/products"))
            router.push("/dashboard/products/new");
          else if (pathname.includes("/sales"))
            router.push("/dashboard/sales/new");
          else if (pathname.includes("/purchases"))
            router.push("/dashboard/purchases/new");
          else if (pathname.includes("/customers"))
            router.push("/dashboard/customers/new");
          else if (pathname.includes("/suppliers"))
            router.push("/dashboard/suppliers/new");
          else if (pathname.includes("/employees"))
            router.push("/dashboard/employees/new");
          else if (pathname.includes("/werehouse"))
            router.push("/dashboard/werehouse/new");
          else router.push("/dashboard/products/new");
          return;
        }
        case "manual-save": {
          const form = document.querySelector<HTMLFormElement>(
            "main form, form[data-keyboard-save]"
          );
          if (form) form.requestSubmit();
          else
            window.dispatchEvent(new CustomEvent("rek:manual-save"));
          return;
        }
        case "print":
          window.print();
          return;
        case "page-search": {
          const el = document.querySelector<HTMLInputElement>(
            'main input[type="search"], main input[aria-label*="گەڕان"], main input[placeholder*="گەڕان"], main input[placeholder*="Search"]'
          );
          if (el) {
            el.focus();
            el.select?.();
          } else openCommandPalette("search");
          return;
        }
        case "refresh":
          router.refresh();
          return;
        case "duplicate": {
          const m = pathname.match(
            /^(\/dashboard\/[^/]+\/)([^/]+)(?:\/edit)?$/
          );
          if (m) {
            router.push(`${m[1]}new?clone=${m[2]}`);
          }
          return;
        }
        case "delete-selected": {
          const btn = document.querySelector<HTMLButtonElement>(
            '[data-keyboard-delete], button[aria-label*="Delete"], button[aria-label*="سڕینەوە"]'
          );
          if (btn && !btn.disabled) btn.click();
          else
            window.dispatchEvent(new CustomEvent("rek:delete-selected"));
          return;
        }
        default: {
          if (shortcutId.startsWith("nav-")) {
            const href = NAV_SLOT_HREFS[shortcutId];
            if (href) router.push(href);
          }
        }
      }
    },
    [pathname, router]
  );

  // Global shortcut dispatcher (does not handle Z/Y — UndoProvider owns those)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      const chord = eventToChord(e);
      if (!chord || chord === "Ctrl" || chord === "Shift") return;

      // Always allow Esc through for dialogs
      if (e.key === "Escape") return;

      const entries = Object.entries({
        ...DEFAULT_BINDINGS,
        ...prefs.bindings,
      }) as Array<[string, ShortcutBinding]>;

      for (const [id, binding] of entries) {
        if (binding.disabled) continue;
        if (!chordsEqual(binding.keys, chord)) continue;

        // Skip most shortcuts while typing, except palette / cheat sheet
        const allowInEditable = [
          "global-search",
          "command-palette",
          "cheat-sheet",
        ].includes(id);
        if (isEditableTarget(e.target) && !allowInEditable) return;

        // Undo/redo left to UndoProvider
        if (id === "undo" || id === "redo") return;

        e.preventDefault();
        runShortcutAction(id);
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prefs.bindings, runShortcutAction]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      prefs,
      labelFor,
      setBinding,
      resetBinding,
      disableBinding,
      toggleFavoriteCommand,
      isFavoriteCommand,
      pushHistory,
      refresh,
    }),
    [
      ready,
      prefs,
      labelFor,
      setBinding,
      resetBinding,
      disableBinding,
      toggleFavoriteCommand,
      isFavoriteCommand,
      pushHistory,
      refresh,
    ]
  );

  return (
    <KeyboardContext.Provider value={value}>{children}</KeyboardContext.Provider>
  );
}

export function useKeyboardProductivity() {
  const ctx = useContext(KeyboardContext);
  if (!ctx) {
    return {
      ready: false,
      prefs: emptyKeyboardPrefs("", ""),
      labelFor: () => undefined as string | undefined,
      setBinding: () => ({ ok: false, conflicts: [] as string[] }),
      resetBinding: () => undefined,
      disableBinding: () => undefined,
      toggleFavoriteCommand: () => undefined,
      isFavoriteCommand: () => false,
      pushHistory: () => undefined,
      refresh: async () => undefined,
    };
  }
  return ctx;
}

// re-export for cheat sheet open from commands
export { openCheatSheet };
