import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ensureDefaultFavorites } from "@/lib/favorites/server";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const bundle = await ensureDefaultFavorites(user.id, user.companyId);
    return NextResponse.json({ success: true, data: bundle });
  } catch (error) {
    console.error("BOOTSTRAP FAVORITES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
