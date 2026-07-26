import {
  ALLOWED_IMAGE_MIME,
  MAX_UPLOAD_BYTES,
  MIME_TO_EXT,
} from "@/lib/uploads/kinds";
import { uploadMessages } from "@/lib/uploads/messages";

export function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "image/gif";
  }

  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  const head = buffer
    .subarray(0, Math.min(256, buffer.length))
    .toString("utf8")
    .trimStart();
  if (
    head.startsWith("<svg") ||
    head.startsWith("<?xml") ||
    head.toLowerCase().includes("<svg")
  ) {
    return null;
  }

  return null;
}

export function validateImageBuffer(buffer: Buffer, declaredSize?: number) {
  const size = declaredSize ?? buffer.length;
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error(uploadMessages.errors.tooLarge);
  }
  const sniffed = sniffImageMime(buffer);
  if (!sniffed || !ALLOWED_IMAGE_MIME.has(sniffed)) {
    throw new Error(uploadMessages.errors.badType);
  }
  return sniffed;
}

export function extensionForMime(mime: string) {
  return MIME_TO_EXT[mime] || "png";
}

/** True when URL is a Vercel Blob public object we manage. */
export function isManagedBlobUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return (
      host.endsWith(".public.blob.vercel-storage.com") ||
      host.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

/** Legacy local `/uploads/...` paths from the old filesystem storage. */
export function isLegacyUploadPath(url: string) {
  return url.startsWith("/uploads/");
}
