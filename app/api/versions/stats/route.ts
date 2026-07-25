import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { versionStats } from "@/lib/versions/query";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await versionStats(user.companyId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("VERSION STATS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
