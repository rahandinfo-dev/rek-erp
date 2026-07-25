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
import SaveGuardDialog from "@/components/unsaved/SaveGuardDialog";
import ConflictDialog from "@/components/unsaved/ConflictDialog";
import { appToast } from "@/lib/toast";
import { buildChangeSummary } from "@/lib/unsaved/changeSummary";
import {
  pushLocalSaveHistory,
  readLocalSaveGuardPrefs,
  readLocalSaveHistory,
  writeLocalSaveGuardPrefs,
} from "@/lib/unsaved/storage";
import {
  fetchSaveGuardPrefs,
  postSaveAudit,
  syncSaveGuardPrefs,
  syncSaveHistory,
} from "@/lib/unsaved/sync";
import {
  DISCARD_UNDO_MS,
  deviceLabel,
  emptySaveGuardPrefs,
  type ConflictPayload,
  type DirtyState,
  type DiscardUndoEntry,
  type SaveGuardPrefs,
  type SaveGuardSource,
  type SaveHistoryEntry,
} from "@/lib/unsaved/types";

type RegisterInput = Omit<SaveGuardSource, "state" | "savedAt" | "changeSummary"> & {
  state?: DirtyState;
  savedAt?: number | null;
  changeSummary?: string[];
};

type PendingNav =
  | { type: "href"; href: string }
  | { type: "action"; run: () => void | Promise<void> }
  | null;

type Ctx = {
  ready: boolean;
  prefs: SaveGuardPrefs;
  sources: SaveGuardSource[];
  hasUnsaved: boolean;
  aggregateState: DirtyState;
  lastSavedAt: number | null;
  history: SaveHistoryEntry[];
  discardUndo: DiscardUndoEntry | null;
  conflict: ConflictPayload | null;
  register: (source: RegisterInput) => void;
  update: (
    id: string,
    patch: Partial<
      Pick<
        SaveGuardSource,
        "state" | "savedAt" | "changeSummary" | "label" | "baseRevision" | "snapshot"
      >
    >
  ) => void;
  unregister: (id: string) => void;
  setPrefs: (patch: Partial<SaveGuardPrefs>) => void;
  requestNavigate: (href: string) => void;
  requestAction: (run: () => void | Promise<void>) => void;
  forceSaveAll: () => Promise<boolean>;
  reportConflict: (payload: ConflictPayload) => void;
  undoDiscard: () => void;
  dismissDiscardUndo: () => void;
};

const SaveGuardContext = createContext<Ctx | null>(null);

function aggregate(sources: SaveGuardSource[]): DirtyState {
  if (sources.some((s) => s.state === "error")) return "error";
  if (sources.some((s) => s.state === "saving")) return "saving";
  if (sources.some((s) => s.state === "modified")) return "modified";
  if (sources.some((s) => s.state === "saved")) return "saved";
  return "clean";
}

function isInternalHref(href: string) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) return false;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      return new URL(href).origin === window.location.origin;
    } catch {
      return false;
    }
  }
  return href.startsWith("/");
}

export function SaveGuardProvider({
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
  const [prefs, setPrefsState] = useState(() =>
    emptySaveGuardPrefs(userId, companyId)
  );
  const [sourcesMap, setSourcesMap] = useState<Record<string, SaveGuardSource>>(
    {}
  );
  const [history, setHistory] = useState<SaveHistoryEntry[]>([]);
  const [pending, setPending] = useState<PendingNav>(null);
  const [dialogSaving, setDialogSaving] = useState(false);
  const [discardUndo, setDiscardUndo] = useState<DiscardUndoEntry | null>(null);
  const [conflict, setConflict] = useState<ConflictPayload | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const bypassRef = useRef(false);
  const syncTimer = useRef<number | undefined>(undefined);
  const sourcesRef = useRef(sourcesMap);

  useEffect(() => {
    sourcesRef.current = sourcesMap;
  }, [sourcesMap]);

  const sources = useMemo(() => Object.values(sourcesMap), [sourcesMap]);
  const hasUnsaved = sources.some(
    (s) => s.state === "modified" || s.state === "saving" || s.state === "error"
  );
  const aggregateState = aggregate(sources);
  const lastSavedAt = useMemo(() => {
    const times = sources
      .map((s) => s.savedAt)
      .filter((t): t is number => typeof t === "number");
    if (history[0]?.savedAt) times.push(history[0].savedAt);
    return times.length ? Math.max(...times) : null;
  }, [sources, history]);

  const persistPrefs = useCallback(
    (next: SaveGuardPrefs, sync = true) => {
      const stamped = { ...next, userId, companyId, updatedAt: Date.now() };
      setPrefsState(stamped);
      writeLocalSaveGuardPrefs(stamped);
      if (!sync) return;
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => {
        void syncSaveGuardPrefs(stamped);
      }, 350);
    },
    [userId, companyId]
  );

  useEffect(() => {
    if (!userId) return;
    const local = readLocalSaveGuardPrefs(userId, companyId);
    const hydrateId = window.setTimeout(() => {
      setPrefsState(local);
      setHistory(readLocalSaveHistory(userId));
      void fetchSaveGuardPrefs().then((remote) => {
        if (remote && remote.updatedAt >= local.updatedAt) {
          writeLocalSaveGuardPrefs(remote);
          setPrefsState(remote);
        }
        setReady(true);
      });
    }, 0);
    return () => window.clearTimeout(hydrateId);
  }, [userId, companyId]);

  // Document title badge
  useEffect(() => {
    const base = document.title.replace(/^\u25CF\s*/, "");
    document.title = hasUnsaved ? `● ${base}` : base;
    return () => {
      document.title = document.title.replace(/^\u25CF\s*/, "");
    };
  }, [hasUnsaved]);

  const register = useCallback((source: RegisterInput) => {
    setSourcesMap((prev) => {
      const existing = prev[source.id];
      return {
        ...prev,
        [source.id]: {
          id: source.id,
          label: source.label,
          moduleKey: source.moduleKey,
          pathname: source.pathname,
          save: source.save,
          discard: source.discard,
          snapshot: source.snapshot,
          baseRevision: source.baseRevision,
          state: source.state ?? existing?.state ?? "clean",
          savedAt: source.savedAt ?? existing?.savedAt ?? null,
          changeSummary:
            source.changeSummary ?? existing?.changeSummary ?? [],
        },
      };
    });
  }, []);

  const update = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          SaveGuardSource,
          | "state"
          | "savedAt"
          | "changeSummary"
          | "label"
          | "baseRevision"
          | "snapshot"
        >
      >
    ) => {
      setSourcesMap((prev) => {
        const cur = prev[id];
        if (!cur) return prev;
        return { ...prev, [id]: { ...cur, ...patch } };
      });
    },
    []
  );

  const unregister = useCallback((id: string) => {
    setSourcesMap((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const setPrefs = useCallback(
    (patch: Partial<SaveGuardPrefs>) => {
      persistPrefs({ ...prefs, ...patch });
    },
    [prefs, persistPrefs]
  );

  const recordHistory = useCallback(
    (entry: Omit<SaveHistoryEntry, "id" | "device"> & { device?: string }) => {
      const full: SaveHistoryEntry = {
        id: `${entry.sourceId}-${entry.savedAt}`,
        device: entry.device || deviceLabel(),
        ...entry,
      };
      const next = pushLocalSaveHistory(userId, full);
      setHistory(next);
      void syncSaveHistory(next);
    },
    [userId]
  );

  const forceSaveAll = useCallback(async () => {
    const dirty = Object.values(sourcesRef.current).filter(
      (s) => s.state === "modified" || s.state === "error" || s.state === "saving"
    );
    if (!dirty.length) return true;

    // Batch of 3
    for (let i = 0; i < dirty.length; i += 3) {
      const chunk = dirty.slice(i, i + 3);
      const results = await Promise.all(
        chunk.map(async (s) => {
          const started = Date.now();
          update(s.id, { state: "saving" });
          try {
            const ok = await s.save();
            const durationMs = Date.now() - started;
            if (ok) {
              update(s.id, { state: "saved", savedAt: Date.now() });
              recordHistory({
                sourceId: s.id,
                label: s.label,
                savedAt: Date.now(),
                durationMs,
                ok: true,
              });
              void postSaveAudit({
                sourceId: s.id,
                label: s.label,
                action: "save",
                summary: s.changeSummary,
                status: "ok",
                device: deviceLabel(),
                durationMs,
              });
            } else {
              update(s.id, { state: "error" });
              recordHistory({
                sourceId: s.id,
                label: s.label,
                savedAt: Date.now(),
                durationMs,
                ok: false,
              });
            }
            return ok;
          } catch {
            update(s.id, { state: "error" });
            return false;
          }
        })
      );
      if (results.some((r) => !r)) return false;
    }
    return true;
  }, [update, recordHistory]);

  const proceedPending = useCallback(async () => {
    const p = pending;
    setPending(null);
    if (!p) return;
    bypassRef.current = true;
    try {
      if (p.type === "href") {
        router.push(p.href);
      } else {
        await p.run();
      }
    } finally {
      window.setTimeout(() => {
        bypassRef.current = false;
      }, 100);
    }
  }, [pending, router]);

  const requestNavigate = useCallback(
    (href: string) => {
      if (bypassRef.current) {
        router.push(href);
        return;
      }
      let path = href;
      try {
        if (href.startsWith("http")) path = new URL(href).pathname;
      } catch {
        /* keep */
      }
      if (path === pathname || path.split("?")[0] === pathname) return;
      if (!hasUnsaved) {
        router.push(href);
        return;
      }
      // Auto-save skip confirm when enabled
      if (prefs.autoSaveEnabled) {
        void forceSaveAll().then((ok) => {
          if (ok) {
            bypassRef.current = true;
            router.push(href);
            window.setTimeout(() => {
              bypassRef.current = false;
            }, 100);
          } else {
            setPending({ type: "href", href });
          }
        });
        return;
      }
      setPending({ type: "href", href });
    },
    [
      hasUnsaved,
      pathname,
      router,
      prefs.autoSaveEnabled,
      forceSaveAll,
    ]
  );

  const requestAction = useCallback(
    (run: () => void | Promise<void>) => {
      if (bypassRef.current || !hasUnsaved) {
        void run();
        return;
      }
      if (prefs.autoSaveEnabled) {
        void forceSaveAll().then((ok) => {
          if (ok) void run();
          else setPending({ type: "action", run });
        });
        return;
      }
      setPending({ type: "action", run });
    },
    [hasUnsaved, prefs.autoSaveEnabled, forceSaveAll]
  );

  // Intercept in-app link clicks
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (bypassRef.current || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      if (e.button !== 0) return;
      const a = (e.target as HTMLElement | null)?.closest?.(
        "a[href]"
      ) as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || !isInternalHref(href)) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      if (!hasUnsaved && !prefs.autoSaveEnabled) return;
      // Always route through guard when dirty
      if (!hasUnsaved) return;
      e.preventDefault();
      e.stopPropagation();
      requestNavigate(href);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [hasUnsaved, prefs.autoSaveEnabled, requestNavigate]);

  // beforeunload when dirty
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!hasUnsaved) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsaved]);

  // Discard undo expiry
  useEffect(() => {
    if (!discardUndo) return;
    const ms = Math.max(0, discardUndo.expiresAt - Date.now());
    const id = window.setTimeout(() => setDiscardUndo(null), ms);
    return () => window.clearTimeout(id);
  }, [discardUndo]);

  const onSaveContinue = useCallback(async () => {
    setDialogSaving(true);
    const ok = await forceSaveAll();
    setDialogSaving(false);
    if (ok) {
      await proceedPending();
    } else {
      appToast.error("Save failed. Fix errors or discard changes.");
    }
  }, [forceSaveAll, proceedPending]);

  const onDiscard = useCallback(async () => {
    const dirty = Object.values(sourcesRef.current).filter(
      (s) => s.state !== "clean"
    );
    for (const s of dirty) {
      const snap = s.snapshot;
      await s.discard();
      update(s.id, { state: "clean", changeSummary: [], savedAt: null });
      void postSaveAudit({
        sourceId: s.id,
        label: s.label,
        action: "discard",
        summary: s.changeSummary,
        status: "ok",
        device: deviceLabel(),
      });
      if (snap !== undefined) {
        setDiscardUndo({
          id: `undo-${s.id}-${Date.now()}`,
          sourceId: s.id,
          label: s.label,
          snapshot: snap,
          expiresAt: Date.now() + DISCARD_UNDO_MS,
          restore: () => {
            window.dispatchEvent(
              new CustomEvent("rek:restore-discard", {
                detail: { sourceId: s.id, snapshot: snap },
              })
            );
          },
        });
        appToast.actionWithUndo({
          title: "Changes discarded",
          message: `“${s.label}” — undo available for 30 seconds`,
          durationMs: DISCARD_UNDO_MS,
          onUndo: () => {
            window.dispatchEvent(
              new CustomEvent("rek:restore-discard", {
                detail: { sourceId: s.id, snapshot: snap },
              })
            );
            setDiscardUndo(null);
          },
        });
      }
    }
    await proceedPending();
  }, [proceedPending, update]);

  const reportConflict = useCallback((payload: ConflictPayload) => {
    setConflict(payload);
  }, []);

  const undoDiscard = useCallback(() => {
    discardUndo?.restore();
    setDiscardUndo(null);
  }, [discardUndo]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      prefs,
      sources,
      hasUnsaved,
      aggregateState,
      lastSavedAt,
      history,
      discardUndo,
      conflict,
      register,
      update,
      unregister,
      setPrefs,
      requestNavigate,
      requestAction,
      forceSaveAll,
      reportConflict,
      undoDiscard,
      dismissDiscardUndo: () => setDiscardUndo(null),
    }),
    [
      ready,
      prefs,
      sources,
      hasUnsaved,
      aggregateState,
      lastSavedAt,
      history,
      discardUndo,
      conflict,
      register,
      update,
      unregister,
      setPrefs,
      requestNavigate,
      requestAction,
      forceSaveAll,
      reportConflict,
      undoDiscard,
    ]
  );

  const dialogSummary = useMemo(() => {
    const lines = sources.flatMap((s) => s.changeSummary);
    if (lines.length) return [...new Set(lines)].slice(0, 10);
    if (hasUnsaved) return ["Unsaved edits on this page"];
    return [];
  }, [sources, hasUnsaved]);

  return (
    <SaveGuardContext.Provider value={value}>
      {children}
      <SaveGuardDialog
        open={Boolean(pending)}
        summary={dialogSummary}
        saving={dialogSaving}
        onSaveContinue={() => void onSaveContinue()}
        onDiscard={() => void onDiscard()}
        onCancel={() => setPending(null)}
      />
      <ConflictDialog
        conflict={conflict}
        onKeepMine={() => {
          if (!conflict) return;
          void postSaveAudit({
            sourceId: conflict.sourceId,
            label: conflict.label,
            action: "conflict-mine",
            summary: ["Kept local version"],
            status: "ok",
            device: deviceLabel(),
          });
          window.dispatchEvent(
            new CustomEvent("rek:conflict-resolve", {
              detail: { sourceId: conflict.sourceId, choice: "mine" },
            })
          );
          setConflict(null);
        }}
        onKeepTheirs={() => {
          if (!conflict) return;
          void postSaveAudit({
            sourceId: conflict.sourceId,
            label: conflict.label,
            action: "conflict-theirs",
            summary: ["Kept remote version"],
            status: "ok",
            device: deviceLabel(),
          });
          window.dispatchEvent(
            new CustomEvent("rek:conflict-resolve", {
              detail: {
                sourceId: conflict.sourceId,
                choice: "theirs",
                data: conflict.theirs,
              },
            })
          );
          setConflict(null);
        }}
        onMerge={() => {
          if (!conflict) return;
          const mine = (conflict.mine || {}) as Record<string, unknown>;
          const theirs = (conflict.theirs || {}) as Record<string, unknown>;
          const merged = { ...theirs, ...mine };
          void postSaveAudit({
            sourceId: conflict.sourceId,
            label: conflict.label,
            action: "conflict-merge",
            summary: buildChangeSummary(theirs, merged),
            status: "ok",
            device: deviceLabel(),
          });
          window.dispatchEvent(
            new CustomEvent("rek:conflict-resolve", {
              detail: {
                sourceId: conflict.sourceId,
                choice: "merge",
                data: merged,
              },
            })
          );
          setConflict(null);
          appToast.success("Merged changes applied");
        }}
        onCompare={() => {
          setCompareOpen(true);
        }}
        onCancel={() => {
          setConflict(null);
          setCompareOpen(false);
        }}
      />
      {compareOpen && conflict ? (
        <div
          className="fixed inset-0 z-[102] flex items-center justify-center bg-[var(--overlay)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Compare versions"
        >
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-black">Compare Versions</h3>
              <button
                type="button"
                className="text-xs font-bold text-muted-foreground"
                onClick={() => setCompareOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="grid max-h-[70vh] gap-0 overflow-auto md:grid-cols-2">
              <pre className="overflow-auto border-b border-border p-3 text-[11px] md:border-b-0 md:border-e">
                <p className="mb-2 font-bold">Mine</p>
                {JSON.stringify(conflict.mine, null, 2)}
              </pre>
              <pre className="overflow-auto p-3 text-[11px]">
                <p className="mb-2 font-bold">Theirs</p>
                {JSON.stringify(conflict.theirs, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </SaveGuardContext.Provider>
  );
}

export function useSaveGuard() {
  const ctx = useContext(SaveGuardContext);
  if (!ctx) {
    return {
      ready: false,
      prefs: emptySaveGuardPrefs("", ""),
      sources: [] as SaveGuardSource[],
      hasUnsaved: false,
      aggregateState: "clean" as DirtyState,
      lastSavedAt: null as number | null,
      history: [] as SaveHistoryEntry[],
      discardUndo: null as DiscardUndoEntry | null,
      conflict: null as ConflictPayload | null,
      register: () => undefined,
      update: () => undefined,
      unregister: () => undefined,
      setPrefs: () => undefined,
      requestNavigate: () => undefined,
      requestAction: (run: () => void | Promise<void>) => void run(),
      forceSaveAll: async () => true,
      reportConflict: () => undefined,
      undoDiscard: () => undefined,
      dismissDiscardUndo: () => undefined,
    };
  }
  return ctx;
}
