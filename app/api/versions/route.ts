import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { tServer } from "@/lib/i18n";
import {
  loadVersionFilters,
  queryVersions,
} from "@/lib/versions/query";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const sp = req.nextUrl.searchParams;
    const data = await queryVersions({
      companyId: user.companyId,
      q: sp.get("q") || undefined,
      entityType: sp.get("entityType") || undefined,
      entityId: sp.get("entityId") || undefined,
      action: sp.get("action") || undefined,
      userId: sp.get("userId") || undefined,
      from: sp.get("from") || undefined,
      to: sp.get("to") || undefined,
      page: Number(sp.get("page") || 1),
      pageSize: Number(sp.get("pageSize") || 25),
      sort: (sp.get("sort") as never) || "newest",
    });

    const filters =
      sp.get("filters") === "1"
        ? await loadVersionFilters(user.companyId)
        : undefined;

    return NextResponse.json({
      success: true,
      data: { ...data, filters },
    });
  } catch (error) {
    console.error("GET VERSIONS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
