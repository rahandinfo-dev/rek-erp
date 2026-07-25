import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buildSearchIndex } from "@/lib/search/enterpriseSearch";

/** Lightweight company index for offline / fuzzy client search */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const items = await buildSearchIndex(user.companyId);
    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        companyId: user.companyId,
        updatedAt: Date.now(),
        items,
      },
    });
  } catch (error) {
    console.error("SEARCH INDEX ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
