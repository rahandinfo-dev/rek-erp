import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { notifySafe } from "@/lib/notifications/create";

const eventSchema = z.object({
  type: z.enum(["INVOICE_PRINTED", "PDF_GENERATED", "ERROR", "WARNING"]),
  title: z.string().min(2).optional(),
  message: z.string().min(2),
  href: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = eventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "زانیاری نادروستە." },
        { status: 400 }
      );
    }

    const data = validation.data;

    const map = {
      INVOICE_PRINTED: {
        category: "INVOICE" as const,
        title: data.title || "پسوولە چاپکرا",
        priority: data.priority || ("NORMAL" as const),
      },
      PDF_GENERATED: {
        category: "INVOICE" as const,
        title: data.title || "PDF دروستکرا",
        priority: data.priority || ("NORMAL" as const),
      },
      ERROR: {
        category: "ERROR" as const,
        title: data.title || "هەڵە",
        priority: data.priority || ("HIGH" as const),
      },
      WARNING: {
        category: "WARNING" as const,
        title: data.title || "ئاگاداری",
        priority: data.priority || ("HIGH" as const),
      },
    }[data.type];

    await notifySafe({
      companyId: user.companyId,
      userId: user.id,
      title: map.title,
      message: data.message,
      category: map.category,
      priority: map.priority,
      href: data.href,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: { type: data.type },
    });

    return NextResponse.json({
      success: true,
      message: "ئاگاداری تۆمارکرا.",
    });
  } catch (error) {
    console.error("NOTIFICATION EVENT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
