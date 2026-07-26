import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import type { Prisma } from "@/lib/prisma/client";
import {
  DEFAULT_PUSH_CATEGORIES,
  PUSH_CATEGORIES,
  parseCategoryMap,
} from "@/lib/pwa/categories";

const prefsSchema = z.object({
  enabled: z.boolean().optional(),
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
      { success: false, message: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const prefs = await db.notificationPushPrefs.findUnique({
    where: { userId: user.id },
  });
  const devices = await db.pushSubscription.count({
    where: { userId: user.id },
  });

  return NextResponse.json({
    success: true,
    data: {
      enabled: prefs?.enabled ?? false,
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
      { success: false, message: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const parsed = prefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid preferences" },
      { status: 400 }
    );
  }

  const existing = await db.notificationPushPrefs.findUnique({
    where: { userId: user.id },
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

  const row = await db.notificationPushPrefs.upsert({
    where: { userId: user.id },
    create: {
      companyId: user.companyId,
      userId: user.id,
      enabled: parsed.data.enabled ?? false,
      categories: clean,
      options: optionsValue,
    },
    update: {
      ...(parsed.data.enabled !== undefined
        ? { enabled: parsed.data.enabled }
        : {}),
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
  if (parsed.data.enabled === false) {
    await db.pushSubscription.deleteMany({ where: { userId: user.id } });
  }

  return NextResponse.json({
    success: true,
    data: {
      enabled: row.enabled,
      categories: parseCategoryMap(row.categories),
      options: row.options,
    },
  });
}
