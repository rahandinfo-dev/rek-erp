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
import { useOnlineStatus } from "@/lib/hooks/useBrowserStore";
import { applyDomSnapshot, captureDomSnapshot } from "@/lib/recovery/capture";
import { encryptPayload, decryptPayload, isEncryptedBlob } from "@/lib/recovery/crypto";
import {
  cleanupExpiredSessions,
  deleteAllLocalSessions,
  deleteLocalSession,
  freshExpiry,
  listLocalSessions,
  readLocalSession,
  writeLocalSession,
} from "@/lib/recovery/storage";
import {
  deleteAllServerSessions,
  deleteServerSession,
  fetchServerSessions,
  logRecoveryAudit,
  syncSessionToServer,
} from "@/lib/recovery/sync";
import {
  MODULE_LABELS,
  RECOVERY_DISMISS_KEY,
  RECOVERY_PENDING_KEY,
  moduleKeyFromPath,
  type ConnectionStatus,
  type RecoveryPayload,
  type SessionRecord,
} from "@/lib/recovery/types";
import WelcomeBackDialog from "@/components/recovery/WelcomeBackDialog";
import SessionDetailsDialog from "@/components/recovery/SessionDetailsDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Ctx = {
  userId: string;
  companyId: string;
  connection: ConnectionStatus;
  sessions: SessionRecord[];
  refreshSessions: () => Promise<void>;
  saveSnapshotNow: () => Promise<void>;
  restoreSession: (session: SessionRecord) => Promise<boolean>;
  discardSession: (moduleKey: string) => Promise<void>;
  discardAll: () => Promise<void>;
  renameSession: (moduleKey: string, title: string) => Promise<void>;
};

const RecoveryContext = createContext<Ctx | null>(null);

function newId() {
  return crypto.randomUUID?.() || `rec_${Date.now()}`;
}

function mergeSessions(local: SessionRecord[], remote: SessionRecord[]) {
  const map = new Map<string, SessionRecord>();
  for (const r of remote) map.set(r.moduleKey, r);
  for (const l of local) {
    const prev = map.get(l.moduleKey);
    if (!prev || l.lastEditedAt >= prev.lastEditedAt) map.set(l.moduleKey, l);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.lastEditedAt - a.lastEditedAt
  );
}

export function SessionRecoveryProvider({
  userId,
  companyId,
  children,
}: {
  userId: string;
  companyId: string;
  children: ReactNode;
}) {
  const pathname = usePathname() || "/dashboard";
  const router = useRouter();

  // Always "online" for the server render and the hydration render — reading
  // navigator.onLine here would emit different HTML on an offline client.
  // useOnlineStatus keeps the server snapshot until hydration is done.
  const online = useOnlineStatus();
  const [connection, setConnection] = useState<ConnectionStatus>("online");
  const [lastOnline, setLastOnline] = useState(true);
  if (online !== lastOnline) {
    setLastOnline(online);
    if (!online) setConnection("offline");
  }
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeSession, setWelcomeSession] = useState<SessionRecord | null>(
    null
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsSession, setDetailsSession] = useState<SessionRecord | null>(
    null
  );
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [recoveryFailed, setRecoveryFailed] = useState(false);
  const [failedSession, setFailedSession] = useState<SessionRecord | null>(
    null
  );

  const savingRef = useRef(false);
  const lastJsonRef = useRef("");
  const bootstrapped = useRef(false);

  const refreshSessions = useCallback(async () => {
    cleanupExpiredSessions(userId);
    const local = listLocalSessions(userId);
    let remote: SessionRecord[] = [];
    if (navigator.onLine) {
      setConnection("syncing");
      remote = await fetchServerSessions();
      setConnection("online");
    }
    const merged = mergeSessions(local, remote);
    // Cache newer remote locally
    for (const r of remote) {
      const loc = readLocalSession(userId, r.moduleKey);
      if (!loc || r.lastEditedAt > loc.lastEditedAt) {
        writeLocalSession(r);
      }
    }
    setSessions(merged);
  }, [userId]);

  const saveSnapshotNow = useCallback(async () => {
    if (!userId || savingRef.current) return;
    // Skip recovery center itself and auth-ish pages
    if (pathname.includes("/recovery")) return;

    const search =
      typeof window !== "undefined" ? window.location.search || "" : "";

    const moduleKey = moduleKeyFromPath(pathname);
    const { payload, summary } = captureDomSnapshot(pathname, search);

    // Skip empty snapshots (idle browsing)
    if (summary.fieldsChanged === 0 && summary.itemCount === 0) {
      // Still capture navigation if user was mid-form previously? skip noise
      const existing = readLocalSession(userId, moduleKey);
      if (!existing) return;
    }

    summary.moduleLabel = MODULE_LABELS[moduleKey] || moduleKey;

    let encrypted;
    try {
      encrypted = await encryptPayload(userId, companyId, payload);
    } catch {
      encrypted = payload;
    }

    const now = Date.now();
    const existing = readLocalSession(userId, moduleKey);
    const record: SessionRecord = {
      version: 1,
      id: existing?.id || newId(),
      userId,
      companyId,
      moduleKey,
      title: existing?.title || null,
      pathname,
      search,
      payload: encrypted,
      summary,
      createdAt: existing?.createdAt || now,
      lastEditedAt: now,
      lastSavedAt: now,
      expiresAt: freshExpiry(),
      sizeBytes: JSON.stringify(encrypted).length,
    };

    const json = JSON.stringify({
      moduleKey,
      pathname,
      search,
      fields: payload.fields,
      scrollY: payload.scrollY,
    });
    if (json === lastJsonRef.current) return;
    lastJsonRef.current = json;

    savingRef.current = true;
    try {
      writeLocalSession(record);
      if (navigator.onLine) {
        setConnection("syncing");
        const ok = await syncSessionToServer(record);
        setConnection(ok ? "online" : "offline");
        if (!existing) {
          void logRecoveryAudit({
            action: "RECOVERY_CREATED",
            moduleKey,
            summary: `Recovery created · ${summary.moduleLabel}`,
          });
        }
      } else {
        setConnection("offline");
      }
      setSessions((prev) => {
        const rest = prev.filter((s) => s.moduleKey !== moduleKey);
        return [record, ...rest].sort(
          (a, b) => b.lastEditedAt - a.lastEditedAt
        );
      });
    } finally {
      savingRef.current = false;
    }
  }, [userId, companyId, pathname]);

  const restoreSession = useCallback(
    async (session: SessionRecord) => {
      try {
        let payload: RecoveryPayload | null = null;
        if (isEncryptedBlob(session.payload)) {
          payload = await decryptPayload<RecoveryPayload>(
            userId,
            companyId,
            session.payload
          );
        } else {
          payload = session.payload as RecoveryPayload;
        }
        if (!payload) {
          setFailedSession(session);
          setRecoveryFailed(true);
          return false;
        }

        try {
          sessionStorage.setItem(
            RECOVERY_PENDING_KEY,
            JSON.stringify(payload)
          );
        } catch {
          /* ignore */
        }

        void logRecoveryAudit({
          action: "RECOVERY_RESTORED",
          moduleKey: session.moduleKey,
          summary: `Recovery restored · ${session.summary.moduleLabel}`,
        });

        const currentSearch =
          typeof window !== "undefined" ? window.location.search || "" : "";
        const target = `${payload.pathname}${payload.search || ""}`;
        if (
          pathname === payload.pathname &&
          currentSearch === (payload.search || "")
        ) {
          applyDomSnapshot(payload);
          try {
            sessionStorage.removeItem(RECOVERY_PENDING_KEY);
          } catch {
            /* ignore */
          }
        } else {
          router.push(target);
        }
        setWelcomeOpen(false);
        setDetailsOpen(false);
        return true;
      } catch {
        setFailedSession(session);
        setRecoveryFailed(true);
        return false;
      }
    },
    [userId, companyId, pathname, router]
  );

  const discardSession = useCallback(
    async (moduleKey: string) => {
      deleteLocalSession(userId, moduleKey);
      await deleteServerSession(moduleKey);
      void logRecoveryAudit({
        action: "RECOVERY_DELETED",
        moduleKey,
        summary: `Recovery deleted · ${moduleKey}`,
      });
      setSessions((prev) => prev.filter((s) => s.moduleKey !== moduleKey));
    },
    [userId]
  );

  const discardAll = useCallback(async () => {
    deleteAllLocalSessions(userId);
    await deleteAllServerSessions();
    void logRecoveryAudit({
      action: "RECOVERY_DELETED",
      moduleKey: "all",
      summary: "All recovery sessions deleted",
    });
    setSessions([]);
  }, [userId]);

  const renameSession = useCallback(
    async (moduleKey: string, title: string) => {
      const rec = readLocalSession(userId, moduleKey);
      if (!rec) return;
      const next = { ...rec, title, lastSavedAt: Date.now() };
      writeLocalSession(next);
      if (navigator.onLine) await syncSessionToServer(next);
      setSessions((prev) =>
        prev.map((s) => (s.moduleKey === moduleKey ? next : s))
      );
    },
    [userId]
  );

  // Boot: load sessions + welcome dialog
  useEffect(() => {
    if (!userId || bootstrapped.current) return;
    bootstrapped.current = true;
    cleanupExpiredSessions(userId);
    void (async () => {
      await refreshSessions();
      // Apply pending restore after navigation
      try {
        const pending = sessionStorage.getItem(RECOVERY_PENDING_KEY);
        if (pending) {
          const payload = JSON.parse(pending) as RecoveryPayload;
          window.setTimeout(() => {
            applyDomSnapshot(payload);
            sessionStorage.removeItem(RECOVERY_PENDING_KEY);
          }, 120);
        }
      } catch {
        /* ignore */
      }

      try {
        if (sessionStorage.getItem(RECOVERY_DISMISS_KEY) === "1") return;
      } catch {
        /* ignore */
      }

      const local = listLocalSessions(userId).filter(
        (s) => s.summary.draftStatus !== "empty"
      );
      if (local.length === 0) return;
      const top = local[0]!;
      // Show welcome if unfinished work exists from a prior visit
      setWelcomeSession(top);
      setWelcomeOpen(true);
    })();
  }, [userId, refreshSessions]);

  // Continuous capture — debounce typing, throttle scroll
  useEffect(() => {
    if (!userId) return;
    let debounceTimer: number | undefined;
    let scrollTimer: number | undefined;

    const schedule = () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        void saveSnapshotNow();
      }, 700);
    };

    const onScroll = () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        void saveSnapshotNow();
      }, 1200);
    };

    const main = document.getElementById("main-content");
    document.addEventListener("input", schedule, true);
    document.addEventListener("change", schedule, true);
    main?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("beforeunload", () => {
      void saveSnapshotNow();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void saveSnapshotNow();
    });

    return () => {
      window.clearTimeout(debounceTimer);
      window.clearTimeout(scrollTimer);
      document.removeEventListener("input", schedule, true);
      document.removeEventListener("change", schedule, true);
      main?.removeEventListener("scroll", onScroll);
    };
  }, [userId, saveSnapshotNow]);

  // Path changes — snapshot previous + refresh
  useEffect(() => {
    void saveSnapshotNow();
  }, [pathname, saveSnapshotNow]);

  // Online / offline
  useEffect(() => {
    function onOnline() {
      setConnection("syncing");
      void (async () => {
        await refreshSessions();
        for (const s of listLocalSessions(userId)) {
          await syncSessionToServer(s);
        }
        setConnection("online");
      })();
    }
    // Going offline is handled by useOnlineStatus above; this listener only
    // drives the reconnect sync.
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [userId, refreshSessions]);

  const value = useMemo<Ctx>(
    () => ({
      userId,
      companyId,
      connection,
      sessions,
      refreshSessions,
      saveSnapshotNow,
      restoreSession,
      discardSession,
      discardAll,
      renameSession,
    }),
    [
      userId,
      companyId,
      connection,
      sessions,
      refreshSessions,
      saveSnapshotNow,
      restoreSession,
      discardSession,
      discardAll,
      renameSession,
    ]
  );

  return (
    <RecoveryContext.Provider value={value}>
      {children}

      <WelcomeBackDialog
        open={welcomeOpen && Boolean(welcomeSession)}
        session={welcomeSession}
        onContinue={() => {
          if (welcomeSession) void restoreSession(welcomeSession);
        }}
        onDiscard={() => setConfirmDiscard(true)}
        onViewDetails={() => {
          setDetailsSession(welcomeSession);
          setDetailsOpen(true);
        }}
      />

      <SessionDetailsDialog
        open={detailsOpen}
        session={detailsSession}
        onClose={() => setDetailsOpen(false)}
        onContinue={() => {
          if (detailsSession) void restoreSession(detailsSession);
        }}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard Session"
        description="Delete this recovery snapshot permanently? This cannot be undone."
        confirmText="Discard Session"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={async () => {
          if (welcomeSession) {
            await discardSession(welcomeSession.moduleKey);
          }
          setConfirmDiscard(false);
          setWelcomeOpen(false);
          try {
            sessionStorage.setItem(RECOVERY_DISMISS_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
      />

      <ConfirmDialog
        open={recoveryFailed}
        title="Recovery Failed"
        description="Unable to restore this session. You can retry or discard it. Your data was not deleted."
        confirmText="Retry"
        cancelText="Discard"
        onCancel={async () => {
          if (failedSession) await discardSession(failedSession.moduleKey);
          setRecoveryFailed(false);
          setFailedSession(null);
        }}
        onConfirm={async () => {
          if (failedSession) {
            const ok = await restoreSession(failedSession);
            if (ok) {
              setRecoveryFailed(false);
              setFailedSession(null);
            }
          }
        }}
      />
    </RecoveryContext.Provider>
  );
}

export function useSessionRecovery() {
  const ctx = useContext(RecoveryContext);
  if (!ctx) {
    return {
      userId: "",
      companyId: "",
      connection: "online" as ConnectionStatus,
      sessions: [] as SessionRecord[],
      refreshSessions: async () => undefined,
      saveSnapshotNow: async () => undefined,
      restoreSession: async () => false,
      discardSession: async () => undefined,
      discardAll: async () => undefined,
      renameSession: async () => undefined,
    };
  }
  return ctx;
}
