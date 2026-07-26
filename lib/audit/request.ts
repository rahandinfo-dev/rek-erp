import type { NextRequest } from "next/server";

export type RequestAuditMeta = {
  ipAddress: string | null;
  userAgent: string | null;
  device: string;
};

export function parseDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return "Unknown";
  const ua = userAgent;
  if (/iPad|Tablet|PlayBook/i.test(ua)) return "Tablet";
  if (/Mobile|Android|iPhone|iPod|webOS|BlackBerry|IEMobile/i.test(ua)) {
    return "Mobile";
  }
  if (/Windows|Macintosh|Linux|CrOS|X11/i.test(ua)) return "Desktop";
  return "هیتر";
}

export function getRequestAuditMeta(
  req: NextRequest | Request
): RequestAuditMeta {
  const headers = req.headers;
  const forwarded = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const cfIp = headers.get("cf-connecting-ip");
  const ipAddress =
    (forwarded?.split(",")[0]?.trim() ||
      realIp ||
      cfIp ||
      headers.get("x-client-ip") ||
      null) ?? null;

  const userAgent = headers.get("user-agent");
  return {
    ipAddress,
    userAgent,
    device: parseDevice(userAgent),
  };
}
