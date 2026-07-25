"use client";

import Image from "next/image";
import { Download, Share, X } from "lucide-react";
import type { InstallPlatform } from "@/lib/pwa/detect";

export default function InstallPrompt({
  platform,
  canNativePrompt,
  forceGuide,
  onInstall,
  onDismiss,
}: {
  platform: InstallPlatform;
  canNativePrompt: boolean;
  forceGuide: boolean;
  onInstall: () => void | Promise<void>;
  onDismiss: (permanent: boolean) => void;
}) {
  const showNative = canNativePrompt && !forceGuide;
  const isIos = platform === "ios";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] p-4 sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-md"
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-modal="false"
    >
      <div className="rounded-3xl border border-border bg-card p-5 shadow-xl shadow-black/10">
        <div className="flex items-start gap-3">
          <Image
            src="/icons/icon-96x96.png"
            alt=""
            width={48}
            height={48}
            className="size-12 rounded-2xl"
            unoptimized
          />
          <div className="min-w-0 flex-1">
            <h2
              id="pwa-install-title"
              className="text-base font-bold text-foreground"
            >
              دامەزراندنی REK ERP
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              وەک ئەپێکی سەربەخۆ لەسەر سکرینەکەت دامەزرێنە — خێراتر، ئۆفلاین، و
              ئاگاداری ڕاستەوخۆ.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(false)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>

        {showNative ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onInstall()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
            >
              <Download size={16} />
              Install App
            </button>
            <button
              type="button"
              onClick={() => onDismiss(false)}
              className="rounded-2xl bg-muted px-4 py-2.5 text-sm font-bold text-muted-foreground"
            >
              Later
            </button>
          </div>
        ) : (
          <ol className="mt-4 space-y-2 rounded-2xl bg-muted/60 p-4 text-sm text-foreground">
            {isIos ? (
              <>
                <li className="flex gap-2">
                  <span className="font-black text-primary">1.</span>
                  <span>
                    لە Safari دوگمەی{" "}
                    <Share className="inline size-4 text-primary" aria-hidden />{" "}
                    Share بکە.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-primary">2.</span>
                  <span>
                    <strong>Add to Home Screen</strong> هەڵبژێرە.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-primary">3.</span>
                  <span>Add دابگرە بۆ کردنەوە وەک ئەپ.</span>
                </li>
              </>
            ) : platform === "android" ? (
              <>
                <li className="flex gap-2">
                  <span className="font-black text-primary">1.</span>
                  <span>مێنیوی Chrome (⋮) بکەرەوە.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-primary">2.</span>
                  <span>
                    <strong>Install app</strong> یان{" "}
                    <strong>Add to Home screen</strong>.
                  </span>
                </li>
              </>
            ) : (
              <>
                <li className="flex gap-2">
                  <span className="font-black text-primary">1.</span>
                  <span>
                    لە ناونیشانی وێبگەڕ، ئایکۆنی Install / ⊕ ببینە.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-primary">2.</span>
                  <span>
                    یان لە مێنیو:{" "}
                    <strong>Apps → Install REK ERP</strong> (Chrome/Edge).
                  </span>
                </li>
              </>
            )}
          </ol>
        )}

        <button
          type="button"
          onClick={() => onDismiss(true)}
          className="mt-3 w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Don&apos;t show again
        </button>
      </div>
    </div>
  );
}
