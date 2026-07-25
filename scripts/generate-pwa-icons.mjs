#!/usr/bin/env node
/**
 * Resize public/logo.png into every PWA / Apple / maskable icon size.
 * Safe to re-run; overwrites files under public/icons and apple-touch-icon.
 */

import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "public/logo.png");
const outDir = resolve(root, "public/icons");

if (!existsSync(source)) {
  console.error("[pwa-icons] Missing public/logo.png");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const ANY_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const APPLE_SIZES = [120, 152, 167, 180];
const FAVICON_SIZES = [16, 32, 48];

async function writeAny(size) {
  const dest = resolve(outDir, `icon-${size}x${size}.png`);
  await sharp(source)
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(dest);
  console.log(`  ✓ ${dest}`);
}

/** Maskable: logo inset ~80% with brand cream padding for safe zone. */
async function writeMaskable(size) {
  const dest = resolve(outDir, `maskable-${size}x${size}.png`);
  const inset = Math.round(size * 0.72);
  const logo = await sharp(source)
    .resize(inset, inset, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 254, g: 244, b: 232, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(dest);
  console.log(`  ✓ ${dest}`);
}

async function writeApple(size) {
  const dest = resolve(outDir, `apple-touch-icon-${size}x${size}.png`);
  await sharp(source)
    .resize(size, size, {
      fit: "contain",
      background: { r: 254, g: 244, b: 232, alpha: 1 },
    })
    .flatten({ background: { r: 254, g: 244, b: 232 } })
    .png()
    .toFile(dest);
  console.log(`  ✓ ${dest}`);
}

async function writeSplash() {
  // Lightweight launch splash used by offline.html / apple startup
  const dest = resolve(outDir, "splash-1125x2436.png");
  const logo = await sharp(source)
    .resize(320, 320, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: 1125,
      height: 2436,
      channels: 4,
      background: { r: 254, g: 244, b: 232, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(dest);
  console.log(`  ✓ ${dest}`);
}

async function writeFavicons() {
  for (const size of FAVICON_SIZES) {
    const dest = resolve(outDir, `favicon-${size}x${size}.png`);
    await sharp(source).resize(size, size).png().toFile(dest);
    console.log(`  ✓ ${dest}`);
  }
  // Canonical apple-touch-icon at public root
  await sharp(source)
    .resize(180, 180, {
      fit: "contain",
      background: { r: 254, g: 244, b: 232, alpha: 1 },
    })
    .flatten({ background: { r: 254, g: 244, b: 232 } })
    .png()
    .toFile(resolve(root, "public/apple-touch-icon.png"));
  console.log("  ✓ public/apple-touch-icon.png");
}

console.log("[pwa-icons] Generating from public/logo.png …");
for (const size of ANY_SIZES) await writeAny(size);
for (const size of [192, 512]) await writeMaskable(size);
for (const size of APPLE_SIZES) await writeApple(size);
await writeSplash();
await writeFavicons();
console.log("[pwa-icons] Done.");
