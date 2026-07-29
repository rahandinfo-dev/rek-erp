import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import type { Prisma } from "@/lib/prisma/client";
import { tServer } from "@/lib/i18n";
import {
  DEFAULT_PUSH_CATEGORIES,
  PUSH_CATEGORIES,
  parseCategoryMap,
} from "@/lib/pwa/categories";

const prefsSchema = z.object({
  pushEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  enabled: z.boolean().optional(), // legacy push client
  categories: z.record(z.string(), z.boolean()).optional(),
  options: z
    .object({
      silent: z.boolean().optional(),
      quietStart: z.string().optional(),
      quietEnd: z.string().optional(),
    })
    .optional()
    .nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: tServer.t("api.unauthorized"), code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const prefs = await db.notificationPushPrefs.findFirst({
    where: { userId: user.id, companyId: user.companyId },
  });
  const devices = await db.pushSubscription.count({
    where: { userId: user.id, companyId: user.companyId },
  });

  return NextResponse.json({
    success: true,
    data: {
      pushEnabled: prefs?.enabled ?? false,
      enabled: prefs?.enabled ?? false,
      soundEnabled: prefs?.soundEnabled ?? false,
      categories: parseCategoryMap(prefs?.categories ?? DEFAULT_PUSH_CATEGORIES),
      options: prefs?.options ?? { silent: false },
      deviceCount: devices,
      categoryKeys: PUSH_CATEGORIES,
    },
  });
}

export async function PUT(req: NextRequest) {
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

  const parsed = prefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: tServer.t("api.invalidPreferences") },
      { status: 400 }
    );
  }

  const existing = await db.notificationPushPrefs.findFirst({
    where: { userId: user.id, companyId: user.companyId },
  });

  const nextCategories = parseCategoryMap({
    ...DEFAULT_PUSH_CATEGORIES,
    ...parseCategoryMap(existing?.categories),
    ...(parsed.data.categories || {}),
  });

  // Only keep known keys
  const clean: Record<string, boolean> = {};
  for (const key of PUSH_CATEGORIES) clean[key] = nextCategories[key];

  const optionsValue: Prisma.InputJsonValue =
    (parsed.data.options as Prisma.InputJsonValue | undefined) ?? {
      silent: false,
    };

  const nextPushEnabled = parsed.data.pushEnabled ?? parsed.data.enabled;

  const row = await db.notificationPushPrefs.upsert({
    where: { userId: user.id },
    create: {
      companyId: user.companyId,
      userId: user.id,
      enabled: nextPushEnabled ?? false,
      soundEnabled: parsed.data.soundEnabled ?? false,
      categories: clean,
      options: optionsValue,
    },
    update: {
      ...(nextPushEnabled !== undefined
        ? { enabled: nextPushEnabled }
        : {}),
      ...(parsed.data.soundEnabled !== undefined ? { soundEnabled: parsed.data.soundEnabled } : {}),
      categories: clean,
      ...(parsed.data.options !== undefined
        ? {
            options:
              parsed.data.options === null
                ? { silent: false }
                : (parsed.data.options as Prisma.InputJsonValue),
          }
        : {}),
    },
  });

  // When disabling, drop subscriptions so OS stops background delivery.
  if (nextPushEnabled === false) {
    await db.pushSubscription.deleteMany({ where: { userId: user.id } });
  }

  return NextResponse.json({
    success: true,
    data: {
      pushEnabled: row.enabled,
      enabled: row.enabled,
      soundEnabled: row.soundEnabled,
      categories: parseCategoryMap(row.categories),
      options: row.options,
    },
  });
}
