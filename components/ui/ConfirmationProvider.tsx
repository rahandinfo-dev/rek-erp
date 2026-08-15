"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export type ConfirmationOptions = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
};

type PendingConfirmation = ConfirmationOptions & {
  resolve: (accepted: boolean) => void;
};

const ConfirmationContext = createContext<
  ((options: ConfirmationOptions) => Promise<boolean>) | null
>(null);

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const pendingRef = useRef<PendingConfirmation | null>(null);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(
    () => () => {
      pendingRef.current?.resolve(false);
    },
    []
  );

  const confirm = useCallback((options: ConfirmationOptions) => {
    pendingRef.current?.resolve(false);
    return new Promise<boolean>((resolve) => {
      const next = { ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const finish = useCallback((accepted: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(accepted);
  }, []);

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.title || ""}
        description={pending?.description || ""}
        confirmText={pending?.confirmText}
        cancelText={pending?.cancelText}
        onConfirm={() => finish(true)}
        onCancel={() => finish(false)}
      />
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirmation must be used inside ConfirmationProvider");
  }
  return context;
}
