/** Unified image upload kinds for REK ERP */

export const UPLOAD_KINDS = [
  "company",
  "avatar",
  "product",
  "category",
  "warehouse",
  "customer",
  "supplier",
  "employee",
  "template",
] as const;

export type UploadKind = (typeof UPLOAD_KINDS)[number];

export function isUploadKind(value: string): value is UploadKind {
  return (UPLOAD_KINDS as readonly string[]).includes(value);
}

/** Max raw file size before compression / rejection */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const ACCEPT_IMAGE =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif";
