"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { registerServiceWorker } from "@/lib/pwa/client";
import { detectPlatform, isStandaloneDisplay } from "@/lib/pwa/detect";
import {
  canShowInstallPrompt,
  canShowUpdatePrompt,
  deferUpdate,
  dismissInstall,
  hasUserInteracted,
  markUserInteracted,
} from "@/lib/pwa/storage";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import UpdatePrompt from "@/components/pwa/UpdatePrompt";
import OfflineIndicator from "@/components/pwa/OfflineIndicator";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaContextValue = {
  installed: boolean;
  canInstall: boolean;
  platform: ReturnType<typeof detectPlatform>;
  deferredPrompt: BeforeInstallPromptEvent | null;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  openInstallGuide: () => void;
  updateReady: boolean;
  applyUpdate: () => void;
  deferUpdatePrompt: () => void;
};

const PwaContext = createContext<PwaContextValue | null>(null);

function subscribeDisplayMode(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onChange);
  };
}

export function usePwa() {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error("usePwa must be used within PwaProvider");
  return ctx;
}

export function usePwaOptional() {
  return useContext(PwaContext);
}

export default function PwaProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const installed = useSyncExternalStore(
    subscribeDisplayMode,
    isStandaloneDisplay,
    () => false
  );
  const platform = useSyncExternalStore(
    () => () => {},
    detectPlatform,
    () => "unknown" as const
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [forceGuide, setForceGuide] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const waitingWorker = useRef<ServiceWorker | null>(null);
  const interacted = useRef(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    interacted.current = hasUserInteracted();

    void registerServiceWorker().then((reg) => {
      if (!reg) return;

      if (reg.waiting) {
        waitingWorker.current = reg.waiting;
        if (canShowUpdatePrompt()) {
          setUpdateReady(true);
          setShowUpdate(true);
        }
      }

      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            waitingWorker.current = reg.waiting;
            if (canShowUpdatePrompt()) {
              setUpdateReady(true);
              setShowUpdate(true);
            }
          }
        });
      });
    });

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = promptEvent;
      setDeferredPrompt(promptEvent);
      if (
        interacted.current &&
        canShowInstallPrompt() &&
        !isStandaloneDisplay()
      ) {
        setShowInstall(true);
      }
    }

    function onInstalled() {
      deferredPromptRef.current = null;
      setDeferredPrompt(null);
      setShowInstall(false);
    }

    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "REK_NAVIGATE" && typeof data.url === "string") {
        router.push(data.url);
      }
    }

    function onInteraction() {
      if (interacted.current) return;
      interacted.current = true;
      markUserInteracted();
      if (
        canShowInstallPrompt() &&
        !isStandaloneDisplay() &&
        (deferredPromptRef.current || detectPlatform() === "ios")
      ) {
        window.setTimeout(() => setShowInstall(true), 1200);
      }
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    window.addEventListener("pointerdown", onInteraction, { once: true });
    window.addEventListener("keydown", onInteraction, { once: true });

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
    };
  }, [router]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable" as const;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPromptRef.current = null;
    setDeferredPrompt(null);
    if (choice.outcome === "dismissed") {
      dismissInstall(false);
      setShowInstall(false);
    }
    return choice.outcome;
  }, [deferredPrompt]);

  const openInstallGuide = useCallback(() => {
    setForceGuide(true);
    setShowInstall(true);
  }, []);

  const applyUpdate = useCallback(() => {
    const worker = waitingWorker.current;
    if (worker) {
      worker.postMessage({ type: "REK_SKIP_WAITING" });
    }
    const reload = () => window.location.reload();
    navigator.serviceWorker?.addEventListener("controllerchange", reload, {
      once: true,
    });
    window.setTimeout(reload, 800);
  }, []);

  const deferUpdatePrompt = useCallback(() => {
    deferUpdate();
    setShowUpdate(false);
  }, []);

  const value = useMemo<PwaContextValue>(
    () => ({
      installed,
      canInstall: Boolean(deferredPrompt) || platform === "ios",
      platform,
      deferredPrompt,
      promptInstall,
      openInstallGuide,
      updateReady,
      applyUpdate,
      deferUpdatePrompt,
    }),
    [
      installed,
      deferredPrompt,
      platform,
      promptInstall,
      openInstallGuide,
      updateReady,
      applyUpdate,
      deferUpdatePrompt,
    ]
  );

  return (
    <PwaContext.Provider value={value}>
      {children}
      <OfflineIndicator />
      {showInstall && !installed ? (
        <InstallPrompt
          platform={platform}
          canNativePrompt={Boolean(deferredPrompt)}
          forceGuide={forceGuide || !deferredPrompt}
          onInstall={async () => {
            const result = await promptInstall();
            if (result === "unavailable") setForceGuide(true);
            else setShowInstall(false);
          }}
          onDismiss={(permanent) => {
            dismissInstall(permanent);
            setShowInstall(false);
            setForceGuide(false);
          }}
        />
      ) : null}
      {showUpdate && updateReady ? (
        <UpdatePrompt onUpdate={applyUpdate} onLater={deferUpdatePrompt} />
      ) : null}
    </PwaContext.Provider>
  );
}
