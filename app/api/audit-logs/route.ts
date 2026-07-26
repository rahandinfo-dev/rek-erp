import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getAuditLogById,
  queryAuditLogs,
  queryEntityVersions,
} from "@/lib/audit/query";

/**
 * Permanent audit ledger. GET only — no DELETE.
 * Supports Activity Timeline: search, filters, cursor, since, scope=mine|team.
 */
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
    const id = searchParams.get("id");
    if (id) {
      const row = await getAuditLogById(user.companyId, id);
      if (!row) {
        return NextResponse.json(
          { success: false, message: "نەدۆزرایەوە" },
          { status: 404 }
        );
      }
      // Authorization: company-scoped only (already filtered)
      return NextResponse.json({ success: true, data: row });
    }

    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    if (entityType && entityId) {
      const versions = await queryEntityVersions(
        user.companyId,
        entityType,
        entityId
      );
      return NextResponse.json({ success: true, data: { versions } });
    }

    const scope = searchParams.get("scope"); // mine | team | all
    const data = await queryAuditLogs({
      companyId: user.companyId,
      scopeUserId: scope === "mine" ? user.id : undefined,
      q: searchParams.get("q") || undefined,
      module: searchParams.get("module") || undefined,
      action: searchParams.get("action") || undefined,
      userId: searchParams.get("userId") || undefined,
      device: searchParams.get("device") || undefined,
      status: searchParams.get("status") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      since: searchParams.get("since") || undefined,
      cursor: searchParams.get("cursor") || undefined,
      page: Number(searchParams.get("page") || 1),
      pageSize: Number(searchParams.get("pageSize") || 25),
      sort:
        searchParams.get("sort") === "oldest" ? "oldest" : "newest",
    });

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        viewerId: user.id,
      },
    });
  } catch (error) {
    console.error("GET AUDIT LOGS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
