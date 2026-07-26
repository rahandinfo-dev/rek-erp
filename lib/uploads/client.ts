"use client";

import type { UploadKind } from "@/lib/uploads/kinds";
import { MAX_UPLOAD_BYTES, ACCEPT_IMAGE } from "@/lib/uploads/kinds";
import { uploadMessages } from "@/lib/uploads/messages";
import { compressImageIfNeeded } from "@/lib/uploads/compress";

export type UploadResult = {
  url: string;
};

export type UploadProgressHandler = (percent: number) => void;

function validateClientFile(file: File) {
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
    throw new Error(uploadMessages.errors.badType);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(uploadMessages.errors.tooLarge);
  }
}

/**
 * Upload with real progress via XHR (fetch cannot report upload progress).
 */
export function uploadImageFile(
  file: File,
  kind: UploadKind,
  onProgress?: UploadProgressHandler
): Promise<UploadResult> {
  validateClientFile(file);

  return new Promise((resolve, reject) => {
    void (async () => {
      try {
        const prepared = await compressImageIfNeeded(file);
        const form = new FormData();
        form.append("file", prepared);
        form.append("kind", kind);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/uploads");
        xhr.responseType = "json";

        xhr.upload.onprogress = (event) => {
          if (!onProgress || !event.lengthComputable) return;
          const pct = Math.max(
            0,
            Math.min(100, Math.round((event.loaded / event.total) * 100))
          );
          onProgress(pct);
        };

        xhr.onload = () => {
          const body =
            typeof xhr.response === "object" && xhr.response
              ? xhr.response
              : (() => {
                  try {
                    return JSON.parse(xhr.responseText);
                  } catch {
                    return null;
                  }
                })();

          if (xhr.status >= 200 && xhr.status < 300 && body?.success && body?.data?.url) {
            onProgress?.(100);
            resolve({ url: String(body.data.url) });
            return;
          }

          reject(
            new Error(
              body?.message || uploadMessages.errors.failed
            )
          );
        };

        xhr.onerror = () => reject(new Error(uploadMessages.errors.network));
        xhr.onabort = () => reject(new Error(uploadMessages.errors.failed));
        xhr.send(form);
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error(uploadMessages.errors.failed)
        );
      }
    })();
  });
}

export async function deleteUploadedImage(url: string): Promise<void> {
  const res = await fetch("/api/uploads", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new Error(body?.message || uploadMessages.errors.deleteFailed);
  }
}

export { ACCEPT_IMAGE, MAX_UPLOAD_BYTES };
