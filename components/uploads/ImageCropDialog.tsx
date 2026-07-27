"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Check, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageCropDialogProps = {
  imageSrc: string;
  aspect: number;
  shape?: "rect" | "round";
  onCancel: () => void;
  onComplete: (file: File) => void;
  fileName?: string;
};

async function cropToFile(
  imageSrc: string,
  crop: Area,
  rotation: number,
  fileName: string
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bw = image.width * cos + image.height * sin;
  const bh = image.width * sin + image.height * cos;

  const offscreen = document.createElement("canvas");
  offscreen.width = bw;
  offscreen.height = bh;
  const octx = offscreen.getContext("2d");
  if (!octx) throw new Error("Canvas not supported");

  octx.translate(bw / 2, bh / 2);
  octx.rotate(rad);
  octx.drawImage(image, -image.width / 2, -image.height / 2);

  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));
  ctx.drawImage(
    offscreen,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Crop failed"))),
      "image/jpeg",
      0.92
    );
  });

  const base = fileName.replace(/\.[^.]+$/, "") || "cropped";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

export default function ImageCropDialog({
  imageSrc,
  aspect,
  shape = "rect",
  onCancel,
  onComplete,
  fileName = "image.jpg",
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  async function confirm() {
    if (!croppedArea || busy) return;
    setBusy(true);
    try {
      const file = await cropToFile(imageSrc, croppedArea, rotation, fileName);
      onComplete(file);
    } catch {
      onCancel();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="بڕین و ڕێکخستنی وێنە"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3"
    >
      <div className="flex w-full max-w-lg flex-col border border-border bg-card shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-black">بڕین · گەورەکردن · سوڕاندن</h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 hover:bg-muted"
            aria-label="داخستن"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative h-[min(55vh,360px)] bg-muted">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={shape}
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-3 border-t border-border p-4">
          <label className="flex items-center gap-3 text-xs font-bold">
            <ZoomOut size={14} aria-hidden />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary"
              aria-label="گەورەکردن"
            />
            <ZoomIn size={14} aria-hidden />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-xs font-bold hover:bg-muted"
              onClick={() => setRotation((r) => r - 90)}
            >
              <RotateCcw size={14} aria-hidden />
              سوڕاندنی چەپ
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-xs font-bold hover:bg-muted"
              onClick={() => setRotation((r) => r + 90)}
            >
              <RotateCw size={14} aria-hidden />
              سوڕاندنی ڕاست
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-xs font-bold hover:bg-muted"
              onClick={() => {
                setZoom(1);
                setRotation(0);
                setCrop({ x: 0, y: 0 });
              }}
            >
              ڕیسێت
            </button>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="border border-border px-4 py-2 text-xs font-bold"
            >
              هەڵوەشاندنەوە
            </button>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={busy || !croppedArea}
              className={cn(
                "inline-flex items-center gap-1.5 bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
              )}
            >
              <Check size={14} aria-hidden />
              {busy ? "چاوەڕێ بکە…" : "پەسەندکردن و بارکردن"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
