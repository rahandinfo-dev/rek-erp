"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/useBrowserStore";

/** Compact banner when the browser reports offline (hydrates safely). */
export default function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center p-2"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground shadow-lg">
        <WifiOff size={14} aria-hidden />
        دەرهێڵ — هەندێک تایبەتمەندی بەردەست نین
      </div>
    </div>
  );
}
