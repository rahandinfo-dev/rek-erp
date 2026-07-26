"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Barcode,
  Bell,
  Boxes,
  Clock,
  CornerDownLeft,
  FileText,
  History,
  IdCard,
  LayoutDashboard,
  Loader2,
  Mic,
  MicOff,
  Moon,
  MoreHorizontal,
  Package,
  Plus,
  Ruler,
  Search,
  Settings,
  ShoppingBasket,
  ShoppingCart,
  Star,
  Sun,
  Truck,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  ALL_STATIC_COMMANDS,
  commandsForPath,
  enrichCommandShortcuts,
} from "@/lib/command/commands";
import { fuzzyMatchCommand } from "@/lib/command/fuzzy";
import {
  pushCommandRecent,
  readCommandRecents,
} from "@/lib/command/recents";
import {
  openCommandPalette,
  openCheatSheet,
  subscribeCommandPalette,
} from "@/lib/command/bus";
import type {
  CommandGroup,
  CommandIconKey,
  CommandItem,
  PaletteMode,
} from "@/lib/command/types";
import { useKeyboardProductivity } from "@/lib/command/keyboardProvider";
import { useSaveGuard } from "@/lib/unsaved/provider";
import { usePathname } from "next/navigation";
import type { SearchGroup, SearchModuleFilter } from "@/lib/search/types";
import { SEARCH_FILTERS } from "@/lib/search/types";
import { SEARCH_QUICK_START } from "@/lib/search/catalog";
import {
  clearSearchHistory,
  pushSearchHistory,
  readSearchHistory,
  removeSearchHistory,
  writeSearchHistory,
  type SearchHistoryEntry,
} from "@/lib/search/history";
import {
  readOfflineIndex,
  searchOfflineIndex,
  writeOfflineIndex,
} from "@/lib/search/offlineCache";
import { formatRelativeUpdated } from "@/lib/search/relativeTime";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useFavorites } from "@/lib/favorites/provider";
import { useNavigationHistory } from "@/lib/history/provider";
import { useDraftOwner } from "@/lib/drafts/owner";
import SearchPreviewPanel from "@/components/search/SearchPreviewPanel";
import SearchQuickActions from "@/components/search/SearchQuickActions";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const ICONS: Record<CommandIconKey, typeof Search> = {
  dashboard: LayoutDashboard,
  product: Package,
  sku: Package,
  barcode: Barcode,
  customer: Users,
  supplier: Truck,
  invoice: FileText,
  sale: ShoppingCart,
  purchase: ShoppingBasket,
  warehouse: Warehouse,
  unit: Ruler,
  employee: IdCard,
  inventory: Boxes,
  reports: FileText,
  settings: Settings,
  notification: Bell,
  plus: Plus,
  theme: Moon,
  search: Search,
  star: Star,
  history: History,
  mic: Mic,
};

function iconForType(type?: string): CommandIconKey {
  const map: Record<string, CommandIconKey> = {
    product: "product",
    sku: "sku",
    barcode: "barcode",
    customer: "customer",
    supplier: "supplier",
    invoice: "invoice",
    sale: "sale",
    purchase: "purchase",
    warehouse: "warehouse",
    unit: "unit",
    employee: "employee",
    inventory: "inventory",
    notification: "notification",
    reports: "reports",
    dashboard: "dashboard",
    settings: "settings",
  };
  return (type && map[type]) || "search";
}

function searchGroupsToCommands(groups: SearchGroup[]): CommandGroup[] {
  return groups.map((g) => ({
    key: `result-${g.key}`,
    label: g.label,
    items: g.items.map((item) => ({
      id: `result-${g.key}-${item.id}`,
      title: item.title,
      subtitle: [
        item.module,
        item.subtitle,
        item.updatedAt ? formatRelativeUpdated(item.updatedAt) : null,
      ]
        .filter(Boolean)
        .join(" · "),
      description: item.description,
      href: item.href,
      editHref: item.editHref,
      keywords: [item.title, item.subtitle || "", item.type, item.module],
      section: "result" as const,
      icon: iconForType(item.type),
      type: item.type,
      module: item.module,
      updatedAt: item.updatedAt,
      preview: item.preview,
      exactMatch: item.exactMatch,
      entityId: item.id,
      entityType: item.type,
    })),
  }));
}

function offlineHitsToGroup(
  hits: ReturnType<typeof searchOfflineIndex>
): CommandGroup | null {
  if (!hits.length) return null;
  return {
    key: "offline",
    label: "Offline cache",
    items: hits.slice(0, 20).map((item) => ({
      id: `offline-${item.type}-${item.id}`,
      title: item.title,
      subtitle: [item.module, item.subtitle].filter(Boolean).join(" · "),
      href: item.href,
      editHref: item.editHref,
      keywords: [item.title],
      section: "result" as const,
      icon: iconForType(item.type),
      type: item.type,
      module: item.module,
      updatedAt: item.updatedAt,
      entityId: item.id,
      entityType: item.type,
    })),
  };
}

function deleteApiFor(item: CommandItem): string | null {
  const id = item.entityId;
  if (!id) return null;
  switch (item.entityType) {
    case "product":
    case "sku":
    case "barcode":
      return `/api/products/${id}`;
    case "customer":
      return `/api/customers/${id}`;
    case "supplier":
      return `/api/suppliers/${id}`;
    case "warehouse":
      return `/api/werehouses/${id}`;
    case "employee":
      return `/api/employees/${id}`;
    default:
      return null;
  }
}

function syncHistoryRemote(history: SearchHistoryEntry[]) {
  if (!navigator.onLine) return;
  void fetch("/api/search/history", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history }),
  }).catch(() => undefined);
}

/** Global smart search + command palette — Ctrl+K / bus. */
export function CommandPaletteHost() {
  const router = useRouter();
  const pathname = usePathname() || "/dashboard";
  const { theme, toggleTheme } = useTheme();
  const favorites = useFavorites();
  const navHistory = useNavigationHistory();
  const draftOwner = useDraftOwner();
  const keyboard = useKeyboardProductivity();
  const saveGuard = useSaveGuard();
  const userId = draftOwner?.userId || favorites.bundle.userId || "";

  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PaletteMode>("search");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchModuleFilter>("all");
  const [loading, setLoading] = useState(false);
  const [apiGroups, setApiGroups] = useState<SearchGroup[]>([]);
  const [exactHref, setExactHref] = useState<string | null>(null);
  const [recents, setRecents] = useState<CommandItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const debounced = useDebouncedValue(query.trim(), 120);

  const staticCommands = useMemo(
    () =>
      enrichCommandShortcuts(ALL_STATIC_COMMANDS, (id) => keyboard.labelFor(id)),
    [keyboard]
  );

  const refreshOfflineIndex = useCallback(async () => {
    if (!userId || !navigator.onLine) return;
    try {
      const res = await fetch("/api/search/index", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) writeOfflineIndex(json.data);
    } catch {
      /* ignore */
    }
  }, [userId]);

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    const local = readSearchHistory(userId);
    setSearchHistory(local);
    if (!navigator.onLine) return;
    try {
      const res = await fetch("/api/search/history", { cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.history)) {
        const remote = json.data.history as SearchHistoryEntry[];
        const merged = [...remote, ...local]
          .filter(
            (e, i, arr) =>
              arr.findIndex(
                (x) => x.query.toLowerCase() === e.query.toLowerCase()
              ) === i
          )
          .sort((a, b) => b.at - a.at)
          .slice(0, 30);
        writeSearchHistory(userId, merged);
        setSearchHistory(merged);
      }
    } catch {
      /* local only */
    }
  }, [userId]);

  const buildEmptyGroups = useCallback((): CommandGroup[] => {
    const groups: CommandGroup[] = [];
    const favCmds = staticCommands.filter((c) =>
      keyboard.prefs.favoriteCommandIds.includes(c.id)
    );
    const histCmds = keyboard.prefs.commandHistory
      .map((h) => staticCommands.find((c) => c.id === h.id))
      .filter(Boolean) as CommandItem[];
    const contextCmds = enrichCommandShortcuts(
      commandsForPath(pathname),
      (id) => keyboard.labelFor(id)
    );

    if (mode === "commands") {
      if (favCmds.length) {
        groups.push({
          key: "cmd-favorites",
          label: "فەرمانە دڵخوازەکان",
          items: favCmds.slice(0, 8),
        });
      }
      if (histCmds.length || recents.length) {
        groups.push({
          key: "command-recent",
          label: "دوایین فەرمانەکان",
          items: (histCmds.length ? histCmds : recents).slice(0, 10),
        });
      }
      if (contextCmds.length) {
        groups.push({
          key: "context",
          label: "Suggested for this page",
          items: contextCmds.slice(0, 8).map((c) => ({
            ...c,
            section: "context" as const,
          })),
        });
      }
      groups.push({
        key: "action",
        label: "فەرمانەکان",
        items: staticCommands.filter((c) => c.section === "action").slice(0, 10),
      });
      groups.push({
        key: "navigate",
        label: "گەشتکردن",
        items: staticCommands
          .filter((c) => c.section === "navigate")
          .slice(0, 10),
      });
      return groups;
    }

    if (searchHistory.length) {
      groups.push({
        key: "search-history",
        label: "دوایین گەڕانەکان",
        items: searchHistory.slice(0, 8).map((h) => ({
          id: `sh-${h.query}`,
          title: h.query,
          subtitle: formatRelativeUpdated(h.at),
          keywords: [h.query],
          section: "history" as const,
          icon: "history" as const,
          actionId: undefined,
          href: undefined,
        })),
      });
    }

    if (favCmds.length) {
      groups.push({
        key: "cmd-favorites",
        label: "فەرمانە دڵخوازەکان",
        items: favCmds.slice(0, 6),
      });
    }

    if (favorites.activeItems.length) {
      groups.push({
        key: "favorites",
        label: "دڵخوازەکان",
        items: favorites.activeItems.slice(0, 6).map((f) => ({
          id: `fav-${f.id}`,
          title: f.alias || f.title,
          subtitle: f.moduleKey,
          href: f.href,
          keywords: [f.title, f.alias || "", f.moduleKey],
          section: "favorites" as const,
          icon: "star" as const,
          module: f.moduleKey,
        })),
      });
    }

    if (navHistory.items.length) {
      groups.push({
        key: "recently-viewed",
        label: "دوایین بینراوەکان",
        items: navHistory.items.slice(0, 6).map((h) => ({
          id: `hist-${h.id || h.href}`,
          title: h.title,
          subtitle: h.subtitle || h.moduleKey,
          href: h.href,
          keywords: [h.title, h.moduleKey],
          section: "recent" as const,
          icon: "history" as const,
          module: h.moduleKey,
        })),
      });
    }

    if (recents.length) {
      groups.push({
        key: "command-recent",
        label: "دوایین فەرمانەکان",
        items: recents.slice(0, 8),
      });
    }

    groups.push({
      key: "popular",
      label: "Popular Pages",
      items: SEARCH_QUICK_START.slice(0, 8).map((p) => ({
        id: `pop-${p.id}`,
        title: p.title,
        subtitle: p.subtitle,
        href: p.href,
        keywords: [p.title],
        section: "popular" as const,
        icon: iconForType(p.type),
        type: p.type,
        module: p.type,
      })),
    });

    groups.push({
      key: "action",
      label: "Actions",
      items: staticCommands.filter((c) => c.section === "action").slice(0, 6),
    });

    return groups;
  }, [
    searchHistory,
    favorites.activeItems,
    navHistory.items,
    recents,
    mode,
    staticCommands,
    keyboard,
    pathname,
  ]);

  const localGroups = useMemo(() => {
    const raw = query.trim();
    const actionsOnly = raw.startsWith(">") || mode === "commands";
    const q = raw.startsWith(">") ? raw.slice(1).trim() : raw;

    if (!q) return buildEmptyGroups();

    const pool =
      mode === "commands"
        ? staticCommands
        : actionsOnly
          ? staticCommands.filter((c) => c.section === "action")
          : staticCommands;

    const scored = pool
      .map((item) => ({ item, score: fuzzyMatchCommand(q, item) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 16)
      .map((x) => x.item);

    const actions = scored.filter((i) => i.section === "action");
    const navigate = scored.filter((i) => i.section === "navigate");
    const groups: CommandGroup[] = [];
    if (actions.length) {
      groups.push({ key: "action", label: "فەرمانەکان", items: actions });
    }
    if (navigate.length) {
      groups.push({ key: "navigate", label: "Pages", items: navigate });
    }
    return groups;
  }, [query, buildEmptyGroups, mode, staticCommands]);

  const resultGroups = useMemo(
    () => searchGroupsToCommands(apiGroups),
    [apiGroups]
  );

  const groups = useMemo(() => {
    const next = [...localGroups];
    if (mode === "commands") return next;
    if (debounced) {
      if (resultGroups.length) next.push(...resultGroups);
      else if (!loading && !navigator.onLine) {
        const offline = offlineHitsToGroup(
          searchOfflineIndex(userId, debounced, filter)
        );
        if (offline) next.push(offline);
      } else if (!loading && userId) {
        const offline = offlineHitsToGroup(
          searchOfflineIndex(userId, debounced, filter)
        );
        if (offline && !resultGroups.length) next.push(offline);
      }
    }
    return next;
  }, [localGroups, resultGroups, debounced, loading, userId, filter, mode]);

  const flatItems = useMemo(
    () => groups.flatMap((g) => g.items),
    [groups]
  );

  const activeItem = flatItems[activeIndex] || null;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setApiGroups([]);
    setExactHref(null);
    setLoading(false);
    setActiveIndex(0);
    setMenuFor(null);
    setFilter("all");
    setMode("search");
    setListening(false);
    recognitionRef.current?.stop();
    abortRef.current?.abort();
  }, []);

  const openPalette = useCallback(
    (nextMode: PaletteMode = "search") => {
      setMode(nextMode);
      setRecents(readCommandRecents(userId));
      void loadHistory();
      void refreshOfflineIndex();
      setOpen(true);
      setActiveIndex(0);
      if (nextMode === "commands") setQuery("");
      window.setTimeout(() => inputRef.current?.focus(), 10);
    },
    [loadHistory, refreshOfflineIndex, userId]
  );

  const run = useCallback(
    (item: CommandItem) => {
      if (item.section === "history" && !item.href) {
        setQuery(item.title);
        return;
      }

      if (mode === "search" && debounced && userId) {
        const next = pushSearchHistory(userId, debounced);
        setSearchHistory(next);
        syncHistoryRemote(next);
      }

      pushCommandRecent(item, userId);
      if (item.id && !item.id.startsWith("sh-") && !item.id.startsWith("fav-")) {
        keyboard.pushHistory(item.id);
      }

      if (item.actionId === "toggle-theme") {
        toggleTheme();
        close();
        return;
      }
      if (item.actionId === "logout") {
        close();
        saveGuard.requestAction(async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
          router.refresh();
        });
        return;
      }
      if (item.actionId === "refresh") {
        close();
        router.refresh();
        return;
      }
      if (item.actionId === "print") {
        close();
        window.print();
        return;
      }
      if (item.actionId === "focus-page-search") {
        close();
        const el = document.querySelector<HTMLInputElement>(
          'main input[type="search"], main input[placeholder*="Search"], main input[placeholder*="گەڕان"]'
        );
        el?.focus();
        return;
      }
      if (item.actionId === "manual-save") {
        close();
        const form = document.querySelector<HTMLFormElement>("main form");
        form?.requestSubmit();
        return;
      }
      if (item.actionId === "open-cheat-sheet") {
        close();
        openCheatSheet();
        return;
      }
      if (item.actionId === "duplicate-record") {
        close();
        const m = pathname.match(/^(\/dashboard\/[^/]+\/)([^/]+)(?:\/edit)?$/);
        if (m) router.push(`${m[1]}new?clone=${m[2]}`);
        return;
      }
      if (item.href) {
        close();
        router.push(item.href);
      }
    },
    [
      close,
      router,
      toggleTheme,
      debounced,
      userId,
      mode,
      keyboard,
      pathname,
      saveGuard,
    ]
  );

  useEffect(() => {
    const unsub = subscribeCommandPalette((shouldOpen, nextMode) => {
      if (shouldOpen) openPalette(nextMode || "search");
      else close();
    });
    return () => {
      unsub();
    };
  }, [openPalette, close]);

  useEffect(() => {
    function onToggle(ev: Event) {
      const detail = (ev as CustomEvent).detail as
        | { mode?: PaletteMode }
        | undefined;
      const nextMode = detail?.mode || "search";
      setOpen((prev) => {
        if (prev) {
          setQuery("");
          setApiGroups([]);
          setExactHref(null);
          setLoading(false);
          setActiveIndex(0);
          setMenuFor(null);
          setMode("search");
          abortRef.current?.abort();
          return false;
        }
        setMode(nextMode);
        setRecents(readCommandRecents(userId));
        void loadHistory();
        void refreshOfflineIndex();
        window.setTimeout(() => inputRef.current?.focus(), 10);
        return true;
      });
    }
    // Open is handled via subscribeCommandPalette (bus) to avoid double-open
    window.addEventListener("rek:command-palette-toggle", onToggle);
    return () => {
      window.removeEventListener("rek:command-palette-toggle", onToggle);
    };
  }, [loadHistory, refreshOfflineIndex, userId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || mode === "commands") return;
    let active = true;
    abortRef.current?.abort();

    const q = debounced.startsWith(">")
      ? debounced.slice(1).trim()
      : debounced;

    if (!q) {
      const clearId = window.setTimeout(() => {
        if (!active) return;
        setApiGroups([]);
        setExactHref(null);
        setLoading(false);
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(clearId);
      };
    }

    if (!navigator.onLine) {
      const offline = searchOfflineIndex(userId, q, filter);
      const group = offlineHitsToGroup(offline);
      const offlineId = window.setTimeout(() => {
        if (!active) return;
        setApiGroups(
          group
            ? [
                {
                  key: "offline",
                  label: group.label,
                  items: offline.slice(0, 30),
                },
              ]
            : []
        );
        setLoading(false);
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(offlineId);
      };
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const loadingId = window.setTimeout(() => {
      if (active) setLoading(true);
    }, 0);

    const typeParam = filter === "all" ? "" : `&type=${filter}`;
    void fetch(`/api/search?q=${encodeURIComponent(q)}${typeParam}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((res) => res.json())
      .then(
        (json: {
          success: boolean;
          data?: {
            groups: SearchGroup[];
            exactHref?: string | null;
          };
        }) => {
          if (!active) return;
          if (json.success && json.data) {
            setApiGroups(json.data.groups);
            setExactHref(json.data.exactHref || null);
          } else {
            setApiGroups([]);
            setExactHref(null);
          }
          setLoading(false);
          setActiveIndex(0);
        }
      )
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Offline fallback
        const offline = searchOfflineIndex(userId, q, filter);
        const group = offlineHitsToGroup(offline);
        setApiGroups(
          group
            ? [
                {
                  key: "offline",
                  label: group.label,
                  items: offline.slice(0, 30),
                },
              ]
            : []
        );
        setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(loadingId);
      controller.abort();
    };
  }, [debounced, open, filter, userId, mode]);

  useEffect(() => {
    const id = window.setTimeout(() => setActiveIndex(0), 0);
    return () => window.clearTimeout(id);
  }, [query, filter]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function startVoice() {
    const SR =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      appToast.error("Voice search is not supported in this browser");
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: {
      results: ArrayLike<{ 0: { transcript: string } }>;
    }) => {
      const text = event.results[0]?.[0]?.transcript || "";
      if (text) setQuery(text);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) =>
        flatItems.length ? (i + 1) % flatItems.length : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        flatItems.length ? (i - 1 + flatItems.length) % flatItems.length : 0
      );
    } else if (e.key === "Tab") {
      e.preventDefault();
      setActiveIndex((i) =>
        e.shiftKey
          ? flatItems.length
            ? (i - 1 + flatItems.length) % flatItems.length
            : 0
          : flatItems.length
            ? (i + 1) % flatItems.length
            : 0
      );
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(Math.max(flatItems.length - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (exactHref && debounced && !e.shiftKey) {
        const exactItem = flatItems.find((i) => i.href === exactHref);
        if (exactItem) {
          run(exactItem);
          return;
        }
        if (userId) {
          const next = pushSearchHistory(userId, debounced);
          setSearchHistory(next);
          syncHistoryRemote(next);
        }
        close();
        router.push(exactHref);
        return;
      }
      const item = flatItems[activeIndex];
      if (item) run(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (menuFor) setMenuFor(null);
      else close();
    }
  }

  async function handleDelete(item: CommandItem) {
    const url = deleteApiFor(item);
    if (!url) {
      appToast.error("Delete is not available for this item");
      return;
    }
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    try {
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        appToast.error(json.message || "Delete failed");
        return;
      }
      appToast.success("سڕایەوە");
      setMenuFor(null);
      setApiGroups((prev) =>
        prev
          .map((g) => ({
            ...g,
            items: g.items.filter((i) => i.id !== item.entityId),
          }))
          .filter((g) => g.items.length)
      );
    } catch {
      appToast.error("Delete failed");
    }
  }

  if (!open) return null;

  const ThemeIcon = theme === "dark" ? Sun : Moon;
  let cursor = -1;
  const offlineReady = Boolean(readOfflineIndex(userId)?.items?.length);

  return (
    <div
      className="rek-cmd-root fixed inset-0 z-[90] flex items-start justify-center px-2 pt-[max(1rem,env(safe-area-inset-top),6vh)] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "commands" ? "پەلێتی فەرمان" : "گەڕانی زیرەک"}
    >
      <button
        type="button"
        className="rek-cmd-backdrop absolute inset-0 bg-[var(--overlay)] backdrop-blur-[3px]"
        aria-label="داخستن"
        onClick={close}
      />

      <div className="rek-cmd-palette relative z-10 flex w-full max-w-[min(860px,100%)] flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-[0_24px_80px_rgba(15,10,20,0.28)]">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search size={18} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              mode === "commands"
                ? "Type a command… (fuzzy · prd · create)"
                : "Search anything…  (> commands · barcode · SKU)"
            }
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              flatItems[activeIndex]
                ? `${listId}-opt-${activeIndex}`
                : undefined
            }
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground/80"
          />
          {mode === "search" ? (
            <button
              type="button"
              onClick={() =>
                listening ? recognitionRef.current?.stop() : startVoice()
              }
              className={cn(
                "rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground",
                listening && "bg-destructive/10 text-destructive"
              )}
              aria-label={listening ? "Stop voice search" : "Voice search"}
              title="Voice search"
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          ) : (
            <span className="hidden text-[10px] font-bold tracking-wide text-muted-foreground uppercase sm:inline">
              Commands
            </span>
          )}
          {loading ? (
            <Loader2 size={16} className="animate-spin text-primary" />
          ) : (
            <kbd className="rek-cmd-kbd hidden sm:inline">esc</kbd>
          )}
        </div>

        {mode === "search" ? (
          <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
            {SEARCH_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition",
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/70 text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1">
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            className="max-h-[min(56vh,480px)] min-w-0 flex-1 overflow-y-auto overscroll-contain py-2"
          >
            {flatItems.length === 0 && !loading ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No results. Try another word
                {offlineReady ? " (offline cache ready)" : ""}.
              </p>
            ) : null}

            {groups.map((group) => (
              <div key={group.key} className="mb-1">
                <div className="flex items-center justify-between px-4 py-1.5">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {group.label}
                  </p>
                  {group.key === "search-history" ? (
                    <button
                      type="button"
                      className="text-[10px] font-bold text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (!userId) return;
                        clearSearchHistory(userId);
                        setSearchHistory([]);
                        syncHistoryRemote([]);
                      }}
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>
                <ul>
                  {group.items.map((item) => {
                    cursor += 1;
                    const index = cursor;
                    const active = index === activeIndex;
                    const Icon =
                      item.actionId === "toggle-theme"
                        ? ThemeIcon
                        : ICONS[item.icon] || Search;
                    const fav =
                      item.href && favorites.isFavorite(item.href);
                    const cmdFav = keyboard.isFavoriteCommand(item.id);
                    const isStaticCmd =
                      item.section === "action" ||
                      item.section === "navigate" ||
                      item.section === "context" ||
                      Boolean(item.actionId);
                    return (
                      <li
                        key={item.id}
                        id={`${listId}-opt-${index}`}
                        role="option"
                        aria-selected={active}
                        data-cmd-index={index}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`rek-cmd-item group/item relative mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted/70"
                        }`}
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 text-start"
                          onClick={() => run(item)}
                        >
                          <span
                            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${
                              active
                                ? "bg-primary-foreground/15"
                                : "bg-muted text-primary"
                            }`}
                          >
                            <Icon size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {item.title}
                            </span>
                            {item.category || item.subtitle ? (
                              <span
                                className={`mt-0.5 block truncate text-xs ${
                                  active
                                    ? "text-primary-foreground/75"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {[item.category, item.subtitle]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            ) : null}
                          </span>
                        </button>

                        {isStaticCmd ? (
                          <button
                            type="button"
                            className={cn(
                              "shrink-0 rounded-md p-1 opacity-70 hover:opacity-100",
                              cmdFav && "text-amber-400 opacity-100"
                            )}
                            aria-label={
                              cmdFav
                                ? "Unfavorite command"
                                : "Favorite command"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              keyboard.toggleFavoriteCommand(item.id);
                            }}
                          >
                            <Star
                              size={12}
                              fill={cmdFav ? "currentColor" : "none"}
                            />
                          </button>
                        ) : null}

                        {item.section === "history" ? (
                          <button
                            type="button"
                            className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100"
                            aria-label="Remove search"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!userId) return;
                              const next = removeSearchHistory(
                                userId,
                                item.title
                              );
                              setSearchHistory(next);
                              syncHistoryRemote(next);
                            }}
                          >
                            <X size={12} />
                          </button>
                        ) : null}

                        {item.section === "result" || item.href ? (
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              className={cn(
                                "rounded-md p-1 opacity-0 transition group-hover/item:opacity-100",
                                active && "opacity-100"
                              )}
                              aria-label="کردارە خێراکان"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuFor((id) =>
                                  id === item.id ? null : item.id
                                );
                              }}
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {menuFor === item.id ? (
                              <SearchQuickActions
                                item={item}
                                isFavorite={Boolean(fav)}
                                onOpen={() => run(item)}
                                onEdit={() => {
                                  if (item.editHref) {
                                    close();
                                    router.push(item.editHref);
                                  }
                                }}
                                onFavorite={() => {
                                  if (!item.href) return;
                                  favorites.toggleFavorite({
                                    href: item.href,
                                    title: item.title,
                                    moduleKey: item.module || item.type,
                                    entityType: item.entityType,
                                    entityId: item.entityId,
                                  });
                                  setMenuFor(null);
                                }}
                                onDelete={
                                  deleteApiFor(item)
                                    ? () => void handleDelete(item)
                                    : undefined
                                }
                                onClose={() => setMenuFor(null)}
                              />
                            ) : null}
                          </div>
                        ) : null}

                        {item.shortcut ? (
                          <span
                            className={`hidden shrink-0 font-mono text-[10px] tracking-wider sm:inline ${
                              active
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {item.shortcut}
                          </span>
                        ) : active && !menuFor ? (
                          <CornerDownLeft
                            size={14}
                            className="shrink-0 opacity-80"
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <SearchPreviewPanel item={activeItem} />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap gap-3">
            <span>
              <kbd className="rek-cmd-kbd">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="rek-cmd-kbd">↵</kbd> open
            </span>
            <span>
              <kbd className="rek-cmd-kbd">tab</kbd> next
            </span>
            <span>
              <kbd className="rek-cmd-kbd">esc</kbd> close
            </span>
            {offlineReady ? (
              <span className="inline-flex items-center gap-1">
                <Clock size={10} /> offline ready
              </span>
            ) : null}
          </div>
          <span className="font-semibold tracking-wide text-primary">
            {mode === "commands"
              ? keyboard.labelFor("command-palette") || "Ctrl+Shift+P"
              : keyboard.labelFor("global-search") || "Ctrl+K"}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Header / mobile trigger — opens the shared palette. */
export default function CommandPaletteTrigger({
  className = "",
  mobile = false,
}: {
  className?: string;
  mobile?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => openCommandPalette()}
      className={`rek-cmd-trigger flex h-11 w-full items-center gap-2 rounded-2xl border border-border bg-secondary/70 px-3 text-right text-sm text-muted-foreground transition hover:border-primary/35 hover:bg-card sm:h-12 sm:px-4 ${className}`}
      aria-label="Open smart search"
    >
      <Search size={18} className="shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 flex-1 truncate">
        {mobile ? "گەڕان…" : "بگەڕێ یان بڕۆ بۆ…"}
      </span>
      {!mobile ? (
        <kbd className="rek-cmd-kbd hidden lg:inline">Ctrl K</kbd>
      ) : null}
    </button>
  );
}
