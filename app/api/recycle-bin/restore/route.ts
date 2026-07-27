import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { restoreUrlFor } from "@/lib/recycle/map";
import { auditSafe } from "@/lib/audit/log";
import { tServer } from "@/lib/i18n";

const schema = z.object({
  id: z.string().min(1).optional(),
  ids: z.array(z.string().min(1)).optional(),
});

async function restoreOne(
  req: NextRequest,
  companyId: string,
  userId: string,
  entryId: string
) {
  const entry = await db.recycleBinEntry.findFirst({
    where: { id: entryId, companyId, status: "deleted" },
  });
  if (!entry) {
    return {
      ok: false,
      id: entryId,
      message: tServer.t("api.recycleNotFound"),
    };
  }

  const api = restoreUrlFor(entry.moduleKey, entry.entityId);
  if (!api) {
    return {
      ok: false,
      id: entryId,
      message: tServer.t("api.restoreUnsupported"),
    };
  }

  const cookie = req.headers.get("cookie") || "";
  const res = await fetch(new URL(api, req.url).toString(), {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
  });

  let json: { success?: boolean; message?: string } = {};
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }

  await auditSafe({
    companyId,
    userId,
    module: "SYSTEM",
    action: "RESTORE",
    entityType: entry.entityType,
    entityId: entry.entityId,
    summary: tServer.t("api.recycleRestoredAudit", { name: entry.name }),
    status: res.ok && json.success !== false ? "success" : "failed",
    metadata: { recycleBinId: entry.id, moduleKey: entry.moduleKey },
    req,
  });

  if (!res.ok || json.success === false) {
    return {
      ok: false,
      id: entryId,
      message: json.message || tServer.t("api.restoreFailed"),
    };
  }

  // Ledger mark is also done via audit RESTORE hook; ensure local mark
  await db.recycleBinEntry.update({
    where: { id: entry.id },
    data: { status: "restored", restoredAt: new Date() },
  });

  return { ok: true, id: entryId };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.invalid") },
        { status: 400 }
      );
    }

    const ids = [
      ...(parsed.data.ids || []),
      ...(parsed.data.id ? [parsed.data.id] : []),
    ];
    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.noIds") },
        { status: 400 }
      );
    }

    const results = [];
    for (const id of ids) {
      results.push(await restoreOne(req, user.companyId, user.id, id));
    }

    const ok = results.every((r) => r.ok);
    return NextResponse.json({
      success: ok,
      data: { results },
      message: ok
        ? tServer.t("api.restored")
        : tServer.t("api.someRestoresFailed"),
    });
  } catch (error) {
    console.error("RECYCLE RESTORE ERROR:", error);
    return NextResponse.json(
      { success: false, message: tServer.t("common.error") },
      { status: 500 }
    );
  }
}
