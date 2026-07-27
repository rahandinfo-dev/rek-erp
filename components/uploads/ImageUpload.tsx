"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
} from "react";
import Image from "next/image";
import { Crop, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import type { UploadKind } from "@/lib/uploads/kinds";
import { ACCEPT_IMAGE } from "@/lib/uploads/kinds";
import { uploadMessages } from "@/lib/uploads/messages";
import {
  deleteUploadedImage,
  uploadImageFile,
} from "@/lib/uploads/client";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import ImageCropDialog from "@/components/uploads/ImageCropDialog";

type ImageUploadProps = {
  kind: UploadKind;
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  description?: string;
  /** Visual crop shape */
  shape?: "square" | "circle" | "wide";
  disabled?: boolean;
  className?: string;
  /** Delete blob when clearing (default true) */
  deleteOnClear?: boolean;
  /** Called with Kurdish error text when upload fails */
  onError?: (message: string) => void;
};

function aspectForShape(shape: "square" | "circle" | "wide") {
  if (shape === "wide") return 16 / 9;
  return 1;
}

export default function ImageUpload({
  kind,
  value,
  onChange,
  label,
  description,
  shape = "square",
  disabled = false,
  className,
  deleteOnClear = true,
  onError,
}: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "compressing" | "uploading">(
    "idle"
  );
  const [progress, setProgress] = useState(0);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropName, setCropName] = useState("image.jpg");

  const displayUrl = preview || value || null;

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    };
  }, [preview, cropSrc]);

  const fail = useCallback(
    (message: string) => {
      onError?.(message);
      appToast.error(message);
    },
    [onError]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (disabled || busy) return;

      const localUrl = URL.createObjectURL(file);
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(localUrl);
      setBusy(true);
      setPhase("compressing");
      setProgress(0);

      const previous = value || null;

      try {
        setPhase("uploading");
        const { url } = await uploadImageFile(file, kind, setProgress);
        onChange(url);
        setPreview(null);
        URL.revokeObjectURL(localUrl);
        appToast.success(uploadMessages.success);

        if (deleteOnClear && previous && previous !== url) {
          void deleteUploadedImage(previous).catch(() => undefined);
        }
      } catch (error) {
        setPreview(null);
        URL.revokeObjectURL(localUrl);
        fail(
          error instanceof Error ? error.message : uploadMessages.errors.failed
        );
      } finally {
        setBusy(false);
        setPhase("idle");
        setProgress(0);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [busy, deleteOnClear, disabled, fail, kind, onChange, preview, value]
  );

  function beginCrop(file: File) {
    if (disabled || busy) return;
    if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    const url = URL.createObjectURL(file);
    setCropName(file.name || "image.jpg");
    setCropSrc(url);
  }

  async function clearImage() {
    if (disabled || busy) return;
    const current = value || null;
    setBusy(true);
    try {
      if (deleteOnClear && current) {
        await deleteUploadedImage(current);
      }
      onChange(null);
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(null);
      appToast.success(uploadMessages.deleted);
    } catch (error) {
      fail(
        error instanceof Error
          ? error.message
          : uploadMessages.errors.deleteFailed
      );
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) beginCrop(file);
  }

  const shapeClass =
    shape === "circle"
      ? "aspect-square"
      : shape === "wide"
        ? "aspect-[16/9]"
        : "aspect-square";

  const statusLabel =
    phase === "compressing"
      ? uploadMessages.compressing
      : phase === "uploading"
        ? `${uploadMessages.uploading} ${progress}%`
        : null;

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <div>
          <p className="text-sm font-bold text-foreground">{label}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={cn(
            "relative w-full max-w-[11rem] overflow-hidden border border-border bg-muted/40",
            shapeClass,
            shape === "circle" && "rounded-none"
          )}
        >
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt={label || uploadMessages.preview}
              fill
              unoptimized
              className="object-cover"
              sizes="176px"
            />
          ) : (
            <div className="flex h-full min-h-[7rem] w-full items-center justify-center text-muted-foreground">
              <ImagePlus size={28} aria-hidden />
            </div>
          )}
          {busy ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 px-3 text-center backdrop-blur-[1px]">
              <Loader2 className="animate-spin text-primary" size={22} />
              {statusLabel ? (
                <p className="text-[11px] font-bold text-foreground">
                  {statusLabel}
                </p>
              ) : null}
              {phase === "uploading" ? (
                <div className="h-1.5 w-full overflow-hidden bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <label
            htmlFor={inputId}
            onDragEnter={(e) => {
              e.preventDefault();
              if (!disabled) setDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={onDrop}
            className={cn(
              "flex min-h-[7rem] cursor-pointer flex-col items-center justify-center border-2 border-dashed px-4 py-5 text-center transition",
              dragging
                ? "border-primary bg-primary/10"
                : "border-primary/35 bg-primary/5 hover:bg-primary/10",
              (disabled || busy) && "pointer-events-none opacity-60"
            )}
          >
            <Upload className="text-primary" size={22} aria-hidden />
            <p className="mt-2 text-sm font-bold text-foreground">
              {displayUrl ? uploadMessages.replace : uploadMessages.dropHint}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Crop size={12} aria-hidden />
              {uploadMessages.types} · {uploadMessages.maxSize} · بڕین پێش بارکردن
            </p>
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept={ACCEPT_IMAGE}
              className="sr-only"
              disabled={disabled || busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) beginCrop(file);
              }}
            />
          </label>

          {displayUrl ? (
            <button
              type="button"
              onClick={() => void clearImage()}
              disabled={disabled || busy}
              className="inline-flex h-9 items-center gap-1.5 border border-destructive/30 px-3 text-xs font-bold text-destructive hover:bg-destructive/5 disabled:opacity-50"
            >
              <Trash2 size={14} aria-hidden />
              {uploadMessages.delete}
            </button>
          ) : null}
        </div>
      </div>

      {cropSrc ? (
        <ImageCropDialog
          imageSrc={cropSrc}
          aspect={aspectForShape(shape)}
          shape={shape === "circle" ? "round" : "rect"}
          fileName={cropName}
          onCancel={() => {
            if (cropSrc.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          onComplete={(file) => {
            if (cropSrc.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
            void uploadFile(file);
          }}
        />
      ) : null}
    </div>
  );
}
