import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

/** Raster images only — SVG is rejected (XSS when served from /uploads). */
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 5 * 1024 * 1024;

function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "image/gif";
  }

  // WEBP (RIFF....WEBP)
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

  // Reject SVG / XML masquerading as images
  const head = buffer.subarray(0, Math.min(256, buffer.length)).toString("utf8").trimStart();
  if (
    head.startsWith("<svg") ||
    head.startsWith("<?xml") ||
    head.toLowerCase().includes("<svg")
  ) {
    return null;
  }

  return null;
}

export async function saveUpload(
  file: File,
  folder: "products" | "company" | "templates" | "employees"
) {
  if (file.size > MAX_BYTES) {
    throw new Error("قەبارەی فایل زۆر گەورەیە (زۆرینە ٥MB).");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const sniffed = sniffImageMime(buffer);

  if (!sniffed || !ALLOWED_MIME.has(sniffed)) {
    throw new Error(
      "جۆری فایل ڕێگەپێنەدراوە. تەنها PNG، JPEG، WEBP یان GIF."
    );
  }

  // Prefer sniffed type over client-declared MIME
  if (file.type && file.type !== sniffed && file.type !== "image/jpg") {
    // Allow image/jpg alias for jpeg; otherwise mistrust client type when it conflicts
    if (!(file.type === "image/jpg" && sniffed === "image/jpeg")) {
      // Still accept if sniffed is valid — client type is advisory only
    }
  }

  const extension = MIME_TO_EXT[sniffed] || "png";
  const fileName = `${randomUUID()}.${extension}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await fs.mkdir(uploadDir, { recursive: true });

  await fs.writeFile(path.join(uploadDir, fileName), buffer);

  return `/uploads/${folder}/${fileName}`;
}

export async function saveProductImage(file: File) {
  return saveUpload(file, "products");
}

export async function saveCompanyLogo(file: File) {
  return saveUpload(file, "company");
}

export async function saveTemplateAsset(file: File) {
  return saveUpload(file, "templates");
}

export async function saveEmployeePhoto(file: File) {
  return saveUpload(file, "employees");
}
