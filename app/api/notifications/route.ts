import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import type {
  NotificationCategory,
  NotificationPriority,
  Prisma,
} from "@/lib/prisma/client";
import { timeAgoKu } from "@/lib/notifications/create";
import { extractNotificationKind } from "@/lib/notifications/kinds";

const CATEGORIES = new Set([
  "PRODUCT",
  "INVENTORY",
  "SALE",
  "PURCHASE",
  "CUSTOMER",
  "SUPPLIER",
  "WAREHOUSE",
  "INVOICE",
  "EMPLOYEE",
  "SYSTEM",
  "ERROR",
  "WARNING",
]);

const PRIORITIES = new Set(["LOW", "NORMAL", "HIGH", "CRITICAL"]);

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") || 20))
    );
    const search = (searchParams.get("search") || "").trim();
    const category = searchParams.get("category") || "";
    const priority = searchParams.get("priority") || "";
    const status = searchParams.get("status") || "active"; // active | unread | read | deleted | all
    const includeDeleted = status === "deleted" || status === "all";

    const where: Prisma.NotificationWhereInput = {
      companyId: user.companyId,
    };

    if (status === "active" || status === "unread" || status === "read") {
      where.deletedAt = null;
    } else if (status === "deleted") {
      where.deletedAt = { not: null };
    }

    if (status === "unread") where.isRead = false;
    if (status === "read") where.isRead = true;

    if (category && CATEGORIES.has(category)) {
      where.category = category as NotificationCategory;
    }

    if (priority && PRIORITIES.has(priority)) {
      where.priority = priority as NotificationPriority;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, unreadCount, items] = await Promise.all([
      db.notification.count({ where }),
      db.notification.count({
        where: {
          companyId: user.companyId,
          deletedAt: null,
          isRead: false,
        },
      }),
      db.notification.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          message: true,
          category: true,
          priority: true,
          isRead: true,
          readAt: true,
          deletedAt: true,
          href: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: items.map((item) => ({
          ...item,
          kind: extractNotificationKind(item.metadata),
          timeAgo: timeAgoKu(item.createdAt),
          date: item.createdAt.toISOString(),
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
        unreadCount,
        includeDeleted,
      },
    });
  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "hard" ? "hard" : "soft";

    if (mode === "hard") {
      // Still keep history: only soft-delete allowed for "delete all"
      // Enterprise requirement: notifications remain forever.
    }

    const result = await db.notification.updateMany({
      where: {
        companyId: user.companyId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "هەموو ئاگادارییەکان شاردرانەوە.",
      data: { count: result.count },
    });
  } catch (error) {
    console.error("DELETE ALL NOTIFICATIONS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
