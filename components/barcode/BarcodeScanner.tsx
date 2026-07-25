"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Camera, ImagePlus, Keyboard, Search, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import type { BarcodeLookupProduct } from "@/lib/barcode/lookup";
import { normalizeScanCode } from "@/lib/barcode/lookup";
import { appToast } from "@/lib/toast";
import { inputClassName } from "@/components/ui/FormPrimitives";

export type ScanAction = "open" | "add" | "select";

type Props = {
  /** Called when a product is found. */
  onProduct?: (product: BarcodeLookupProduct, code: string) => void;
  /** Called when code is scanned but no product exists. */
  onNotFound?: (code: string) => void;
  /** open = navigate intent; add = cart; select = workbench select */
  action?: ScanAction;
  /** Listen for USB keyboard-wedge even when scan field not focused. */
  usbListen?: boolean;
  /** Show camera button (mobile/tablet/desktop). */
  camera?: boolean;
  /** Compact embed for forms. */
  compact?: boolean;
  className?: string;
  placeholder?: string;
};

async function lookupBarcode(code: string) {
  const res = await fetch(
    `/api/products/by-barcode?code=${encodeURIComponent(code)}`,
    { cache: "no-store" }
  );
  return res.json() as Promise<{
    success: boolean;
    found?: boolean;
    code?: string;
    data: BarcodeLookupProduct | null;
    message?: string;
  }>;
}

/**
 * Integrated barcode scanner: USB wedge + camera + manual search.
 * Works on desktop, tablet, and mobile.
 */
export default function BarcodeScanner({
  onProduct,
  onNotFound,
  action = "select",
  usbListen = true,
  camera = true,
  compact = false,
  className = "",
  placeholder = "بارکۆد یان SKU…",
}: Props) {
  const reactId = useId().replace(/:/g, "");
  const cameraRegionId = `barcode-cam-${reactId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef("");
  const lastKeyAt = useRef(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handlingRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const handleCode = useCallback(
    async (raw: string) => {
      const code = normalizeScanCode(raw);
      if (!code || handlingRef.current) return;
      handlingRef.current = true;
      setBusy(true);
      setLastCode(code);
      setQuery(code);

      try {
        const json = await lookupBarcode(code);
        if (!json.success) {
          appToast.error(json.message || "گەڕان سەرنەکەوت.");
          return;
        }

        if (json.found && json.data) {
          if (!json.data.active) {
            appToast.warning("بەرهەم ناچالاکە", json.data.name);
          }
          onProduct?.(json.data, code);
          if (action === "open") {
            appToast.success("بەرهەم دۆزرایەوە", json.data.name);
          } else if (action === "add") {
            appToast.success("زیادکرا", json.data.name);
          }
        } else {
          appToast.warning("بەرهەم نەدۆزرایەوە", code);
          onNotFound?.(code);
        }
      } catch {
        appToast.error("گەڕان سەرنەکەوت.");
      } finally {
        setBusy(false);
        handlingRef.current = false;
        bufferRef.current = "";
      }
    },
    [action, onNotFound, onProduct]
  );

  // USB / keyboard-wedge: rapid key bursts ending with Enter.
  useEffect(() => {
    if (!usbListen) return;

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;

      // Allow when focused on our scan input, or when not typing elsewhere.
      const isOurInput = target === inputRef.current;
      if (isEditable && !isOurInput) return;
      if (cameraOpen) return;

      const now = Date.now();
      if (now - lastKeyAt.current > 80) {
        bufferRef.current = "";
      }
      lastKeyAt.current = now;

      if (e.key === "Enter") {
        const code = bufferRef.current;
        bufferRef.current = "";
        if (code.length >= 3) {
          e.preventDefault();
          void handleCode(code);
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        bufferRef.current += e.key;
        // Typical wedge dumps full code fast; commit if long enough + idle.
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [usbListen, cameraOpen, handleCode]);

  useEffect(() => {
    if (!cameraOpen) {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        void scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => undefined);
      }
      return;
    }

    let cancelled = false;
    const scanner = new Html5Qrcode(cameraRegionId);
    scannerRef.current = scanner;
    const clearErrorId = window.setTimeout(() => {
      if (!cancelled) setCameraError(null);
    }, 0);

    void scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decoded) => {
          if (cancelled) return;
          void handleCode(decoded);
          setCameraOpen(false);
        },
        () => undefined
      )
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "کامێرا بەردەست نییە.";
        setCameraError(msg);
        appToast.error("کامێرا کردنەوە سەرنەکەوت", msg);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(clearErrorId);
      void scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => undefined);
      if (scannerRef.current === scanner) scannerRef.current = null;
    };
  }, [cameraOpen, cameraRegionId, handleCode]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    void handleCode(query);
  }

  async function onImageFile(file: File) {
    setBusy(true);
    try {
      const scanner = new Html5Qrcode(`barcode-file-${reactId}`);
      const decoded = await scanner.scanFile(file, false);
      try {
        scanner.clear();
      } catch {
        /* ignore */
      }
      if (decoded) {
        await handleCode(decoded);
      } else {
        appToast.warning("بارکۆد نەدۆزرایەوە", "وێنەیەکی ڕوونتر تاقی بکەرەوە");
      }
    } catch {
      appToast.error("خوێندنەوەی وێنە سەرنەکەوت", "وێنەیەکی بارکۆد هەڵبژێرە");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <form
        onSubmit={submitSearch}
        className={`flex flex-col gap-2 sm:flex-row sm:items-center ${
          compact ? "" : ""
        }`}
      >
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            inputMode="search"
            className={`${inputClassName} pr-9`}
            aria-label="گەڕانی بارکۆد"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy || !query.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <Keyboard size={16} />
            {busy ? "…" : "گەڕان"}
          </button>
          {camera ? (
            <button
              type="button"
              onClick={() => setCameraOpen((v) => !v)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-bold text-primary"
            >
              <Camera size={16} />
              {cameraOpen ? "داخستنی کامێرا" : "کامێرا"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-bold text-primary disabled:opacity-50"
          >
            <ImagePlus size={16} />
            وێنەی بارکۆد
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImageFile(file);
            }}
          />
        </div>
      </form>

      {!compact ? (
        <p className="text-xs text-muted-foreground">
          USB سکانەر · کامێرا · گەڕان — دێسکتۆپ / تابلێت / مۆبایل
          {lastCode ? ` · دوایین: ${lastCode}` : ""}
        </p>
      ) : null}

      {cameraOpen ? (
        <div className="overflow-hidden rounded-3xl border border-border bg-black/90 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-white">سکانکردنی کامێرا</p>
            <button
              type="button"
              onClick={() => setCameraOpen(false)}
              className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-2 py-1 text-xs font-bold text-white"
            >
              <X size={14} />
              داخستن
            </button>
          </div>
          <div id={cameraRegionId} className="overflow-hidden rounded-2xl" />
          {cameraError ? (
            <p className="mt-2 text-xs text-rose-300">{cameraError}</p>
          ) : (
            <p className="mt-2 text-xs text-white/70">
              بارکۆد بگرە ناو چوارچێوەکە — خۆکار دەخوێنرێتەوە
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
