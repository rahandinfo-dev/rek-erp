/**
 * Client-side image compression via canvas.
 * Skips GIF (animation) and already-small files.
 */

const COMPRESS_THRESHOLD = 900 * 1024; // ~900KB
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file;
  if (file.size <= COMPRESS_THRESHOLD) return file;

  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const preferPng = file.type === "image/png" && hasTransparencyHint(file);
    const mime = preferPng ? "image/png" : "image/jpeg";

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        resolve,
        mime,
        mime === "image/jpeg" ? JPEG_QUALITY : undefined
      );
    });

    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    const ext = mime === "image/png" ? "png" : "jpg";
    return new File([blob], `${base}.${ext}`, { type: mime, lastModified: Date.now() });
  } catch {
    return file;
  }
}

function hasTransparencyHint(file: File) {
  // Prefer keeping PNG when the original was PNG; canvas loses alpha on JPEG.
  return file.type === "image/png";
}
