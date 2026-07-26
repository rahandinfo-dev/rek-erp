import { put, del } from "@vercel/blob";
import { randomUUID } from "crypto";
import type { UploadKind } from "@/lib/uploads/kinds";
import {
  extensionForMime,
  isLegacyUploadPath,
  isManagedBlobUrl,
  validateImageBuffer,
} from "@/lib/uploads/validate";
import { uploadMessages } from "@/lib/uploads/messages";

/**
 * Persist an image to Vercel Blob (production-safe, durable URLs).
 * Path is namespaced by companyId + kind for isolation.
 */
export async function saveUpload(
  file: File,
  kind: UploadKind,
  companyId: string
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "خزێنەی وێنە ڕێک نەخراوە. BLOB_READ_WRITE_TOKEN زیاد بکە."
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const mime = validateImageBuffer(buffer, file.size);
  const ext = extensionForMime(mime);
  const pathname = `${companyId}/${kind}/${randomUUID()}.${ext}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: mime,
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return blob.url;
}

/**
 * Delete a previously uploaded blob when the user clears/replaces an image.
 * Legacy `/uploads/...` paths are ignored (ephemeral local FS).
 */
export async function deleteUpload(
  url: string,
  companyId: string
): Promise<void> {
  if (!url) return;

  if (isLegacyUploadPath(url)) {
    return;
  }

  if (!isManagedBlobUrl(url)) {
    return;
  }

  // Safety: only delete objects under this company's prefix
  let pathname = "";
  try {
    pathname = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    throw new Error(uploadMessages.errors.deleteFailed);
  }

  if (!pathname.startsWith(`${companyId}/`)) {
    throw new Error(uploadMessages.errors.deleteFailed);
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(uploadMessages.errors.deleteFailed);
  }

  await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
}
