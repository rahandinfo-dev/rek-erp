"use client";

import ConnectionStatusBadge from "@/components/recovery/ConnectionStatus";
import { useSessionRecovery } from "@/lib/recovery/provider";

export default function HeaderConnectionStatus() {
  const { connection } = useSessionRecovery();
  return (
    <ConnectionStatusBadge
      status={connection}
      className="hidden sm:inline-flex"
    />
  );
}
