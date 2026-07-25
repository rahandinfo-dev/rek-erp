import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { runInventoryAlerts } from "@/lib/notifications/stock";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const alerts = await runInventoryAlerts(user.companyId);
    const created = alerts.filter((a) => a.created);

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        createdCount: created.length,
        created,
      },
      message:
        created.length > 0
          ? `${created.length} ئاگاداری کۆگا دروستکرا.`
          : "هیچ ئاگاداری نوێی کۆگا نییە.",
    });
  } catch (error) {
    console.error("INVENTORY ALERTS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
