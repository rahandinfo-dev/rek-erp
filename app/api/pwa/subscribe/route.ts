import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { DEFAULT_PUSH_CATEGORIES } from "@/lib/pwa/categories";
import { tServer } from "@/lib/i18n";

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
  userAgent: z.string().max(512).optional(),
  browser: z.string().max(64).optional(),
  platform: z.string().max(64).optional(),
});

function detectBrowser(ua: string) {
  if (/edg/i.test(ua)) return "edge";
  if (/chrome|crios/i.test(ua)) return "chrome";
  if (/firefox|fxios/i.test(ua)) return "firefox";
  if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) return "safari";
  return "other";
}

function detectPlatform(ua: string) {
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/windows/i.test(ua)) return "windows";
  if (/mac/i.test(ua)) return "macos";
  return "other";
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: tServer.t("api.unauthorized"), code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: tServer.t("api.invalidJson") },
      { status: 400 }
    );
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: tServer.t("api.invalidSubscriptionPayload") },
      { status: 400 }
    );
  }

  const ua =
    parsed.data.userAgent || req.headers.get("user-agent") || undefined;
  const browser = parsed.data.browser || (ua ? detectBrowser(ua) : "other");
  const platform = parsed.data.platform || (ua ? detectPlatform(ua) : "other");

  const endpointOwner = await db.pushSubscription.findUnique({
    where: { endpoint: parsed.data.endpoint },
    select: { userId: true, companyId: true },
  });
  // An endpoint is a bearer capability. Never let a different signed-in user
  // claim it, even when they happen to know its URL.
  if (endpointOwner && (endpointOwner.userId !== user.id || endpointOwner.companyId !== user.companyId)) {
    return NextResponse.json(
      { success: false, message: tServer.t("api.invalidSubscriptionPayload"), code: "ENDPOINT_OWNED" },
      { status: 409 }
    );
  }

  const row = await db.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      companyId: user.companyId,
      userId: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: ua?.slice(0, 512),
      browser,
      platform,
    },
    update: {
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: ua?.slice(0, 512),
      browser,
      platform,
      lastSeenAt: new Date(),
    },
  });

  // Enabling a subscription implies the user wants push — flip prefs on.
  await db.notificationPushPrefs.upsert({
    where: { userId: user.id },
    create: {
      companyId: user.companyId,
      userId: user.id,
      enabled: true,
      categories: DEFAULT_PUSH_CATEGORIES,
    },
    update: { enabled: true },
  });

  return NextResponse.json({
    success: true,
    data: { id: row.id },
  });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: tServer.t("api.unauthorized"), code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let endpoint: string | undefined;
  try {
    const body = await req.json();
    endpoint = typeof body?.endpoint === "string" ? body.endpoint : undefined;
  } catch {
    /* optional body */
  }

  if (endpoint) {
    await db.pushSubscription.deleteMany({
      where: { userId: user.id, endpoint },
    });
  } else {
    await db.pushSubscription.deleteMany({ where: { userId: user.id } });
  }

  return NextResponse.json({ success: true });
}
