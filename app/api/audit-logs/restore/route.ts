import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAuditLogById } from "@/lib/audit/query";
import { restoreApiFor } from "@/lib/audit/restore";
import { auditSafe } from "@/lib/audit/log";

const schema = z.object({
  auditId: z.string().min(1),
});

/**
 * Restore previous version when the original action was a soft-delete
 * (calls entity restore API). Does not invent business logic — delegates.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid" },
        { status: 400 }
      );
    }

    const row = await getAuditLogById(user.companyId, parsed.data.auditId);
    if (!row) {
      return NextResponse.json(
        { success: false, message: "Not found" },
        { status: 404 }
      );
    }

    const api = restoreApiFor(row);
    if (!api || row.action !== "DELETE") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Restore is only available for soft-deleted records with a restore endpoint.",
        },
        { status: 400 }
      );
    }

    const cookie = req.headers.get("cookie") || "";
    const res = await fetch(new URL(api, req.url).toString(), {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json",
      },
    });

    // Some restore routes use DELETE method? Check products restore - usually POST or PATCH
    // Looking at codebase - restore is often POST. If 405 try again with different method.
    let ok = res.ok;
    let json: { success?: boolean; message?: string } = {};
    try {
      json = await res.json();
    } catch {
      /* ignore */
    }

    if (!ok && res.status === 405) {
      const res2 = await fetch(new URL(api, req.url).toString(), {
        method: "PATCH",
        headers: { cookie, "content-type": "application/json" },
      });
      ok = res2.ok;
      try {
        json = await res2.json();
      } catch {
        /* ignore */
      }
    }

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: row.module,
      action: "RESTORE",
      entityType: row.entityType,
      entityId: row.entityId,
      summary: `Restored from activity ${row.id}`,
      oldValue: row.newValue,
      newValue: row.oldValue,
      status: ok ? "success" : "failed",
      req,
    });

    if (!ok) {
      return NextResponse.json(
        {
          success: false,
          message: json.message || "Restore failed",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: json });
  } catch (error) {
    console.error("AUDIT RESTORE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
