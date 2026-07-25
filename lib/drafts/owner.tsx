"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { cleanupExpiredDrafts } from "@/lib/drafts/storage";

type DraftOwner = {
  userId: string;
  companyId: string;
};

const DraftOwnerContext = createContext<DraftOwner | null>(null);

export function DraftOwnerProvider({
  userId,
  companyId,
  children,
}: {
  userId: string;
  companyId: string;
  children: ReactNode;
}) {
  useEffect(() => {
    cleanupExpiredDrafts(userId);
  }, [userId]);

  const value = useMemo(
    () => ({ userId, companyId }),
    [userId, companyId]
  );

  return (
    <DraftOwnerContext.Provider value={value}>
      {children}
    </DraftOwnerContext.Provider>
  );
}

export function useDraftOwner(): DraftOwner {
  const ctx = useContext(DraftOwnerContext);
  if (!ctx) {
    return { userId: "", companyId: "" };
  }
  return ctx;
}
