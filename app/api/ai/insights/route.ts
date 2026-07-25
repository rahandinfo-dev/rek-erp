import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getBusinessHealth,
  listInsights,
  refreshAiInsights,
} from "@/lib/ai/insights";
import { buildRecommendations } from "@/lib/ai/recommendations";
import { refreshAiAlerts } from "@/lib/ai/alerts";
import { suggestedNextActions } from "@/lib/ai/automation";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const refresh = url.searchParams.get("refresh") === "1";

    const [insights, alerts, recommendations, health, nextActions] =
      await Promise.all([
        refresh ? refreshAiInsights(user.companyId) : listInsights(user.companyId),
        refreshAiAlerts(user.companyId),
        buildRecommendations(user.companyId),
        getBusinessHealth(user.companyId),
        suggestedNextActions(user.companyId),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        insights,
        alerts,
        recommendations,
        health,
        nextActions,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("AI INSIGHTS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
