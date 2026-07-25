"use client";

/**
 * Lightweight AES-GCM encryption for recovery payloads.
 * Key derived from userId+companyId — never stores passwords or auth tokens.
 */

function toB64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function fromB64(b64: string) {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function deriveKey(userId: string, companyId: string) {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    enc.encode(`rek-recovery:${userId}:${companyId}`),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("rek-session-v1"),
      iterations: 100_000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptPayload(
  userId: string,
  companyId: string,
  payload: unknown
): Promise<{ v: 1; iv: string; data: string }> {
  const key = await deriveKey(userId, companyId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return { v: 1, iv: toB64(iv.buffer), data: toB64(cipher) };
}

export async function decryptPayload<T>(
  userId: string,
  companyId: string,
  blob: { v: 1; iv: string; data: string }
): Promise<T | null> {
  try {
    const key = await deriveKey(userId, companyId);
    const iv = fromB64(blob.iv);
    const data = fromB64(blob.data);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    return null;
  }
}

export function isEncryptedBlob(
  value: unknown
): value is { v: 1; iv: string; data: string } {
  if (!value || typeof value !== "object") return false;
  const v = value as { v?: unknown; iv?: unknown; data?: unknown };
  return v.v === 1 && typeof v.iv === "string" && typeof v.data === "string";
}
