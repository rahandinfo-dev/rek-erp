import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { queryVersions } from "@/lib/versions/query";
import { auditSafe } from "@/lib/audit/log";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const sp = req.nextUrl.searchParams;
    const result = await queryVersions({
      companyId: user.companyId,
      q: sp.get("q") || undefined,
      entityType: sp.get("entityType") || undefined,
      entityId: sp.get("entityId") || undefined,
      action: sp.get("action") || undefined,
      userId: sp.get("userId") || undefined,
      from: sp.get("from") || undefined,
      to: sp.get("to") || undefined,
      page: 1,
      pageSize: 500,
      sort: (sp.get("sort") as never) || "newest",
    });

    const rows = result.items.map((v) => ({
      version: v.versionNumber,
      record: v.recordName,
      entityType: v.entityType,
      entityId: v.entityId,
      action: v.action,
      user: v.userName || "",
      date: v.date,
      time: v.time,
      changedFields: v.changedFields.map((f) => f.field).join("; "),
      comment: v.comment || "",
    }));

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "SYSTEM",
      action: "EXPORT",
      entityType: sp.get("entityType") || "EntityVersion",
      entityId: sp.get("entityId") || undefined,
      summary: `Exported ${rows.length} version history rows`,
      req,
    });

    return NextResponse.json({ success: true, data: { rows } });
  } catch (error) {
    console.error("EXPORT VERSIONS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
