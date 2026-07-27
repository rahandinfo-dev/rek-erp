import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buildRecommendations } from "@/lib/ai/recommendations";
import { tServer } from "@/lib/i18n";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }
    const data = await buildRecommendations(user.companyId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("AI RECS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
