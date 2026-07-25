import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { createBulkJob, processBulkJobBatch, serializeJob } from "@/lib/bulk/job";
import { BULK_ACTIONS, BULK_MODULES } from "@/lib/bulk/types";

const createSchema = z.object({
  moduleKey: z.enum(BULK_MODULES),
  action: z.enum(BULK_ACTIONS),
  ids: z.array(z.string().min(1)).min(1).max(2000),
  payload: z
    .object({
      fields: z.record(z.string(), z.unknown()).optional(),
      status: z.string().optional(),
      active: z.boolean().optional(),
      categoryId: z.string().nullable().optional(),
      warehouseId: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      format: z.enum(["csv", "excel", "pdf"]).optional(),
      reason: z.string().optional(),
    })
    .optional(),
  /** Process first batch immediately */
  autostart: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const limit = Math.min(
      50,
      Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 20))
    );

    const jobs = await db.bulkJob.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        moduleKey: true,
        action: true,
        status: true,
        totalCount: true,
        processedCount: true,
        successCount: true,
        failedCount: true,
        skippedCount: true,
        cancelledCount: true,
        canUndo: true,
        undoneAt: true,
        createdAt: true,
        finishedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        items: jobs.map((j) => ({
          ...j,
          canUndo: j.canUndo && !j.undoneAt,
          createdAt: j.createdAt.getTime(),
          finishedAt: j.finishedAt?.getTime() ?? null,
          undoneAt: j.undoneAt?.getTime() ?? null,
        })),
      },
    });
  } catch (error) {
    console.error("BULK JOBS LIST ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

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
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid bulk job request" },
        { status: 400 }
      );
    }

    const job = await createBulkJob({
      companyId: user.companyId,
      userId: user.id,
      moduleKey: parsed.data.moduleKey,
      action: parsed.data.action,
      ids: parsed.data.ids,
      payload: parsed.data.payload,
    });

    let data = await serializeJob(job.id);
    if (parsed.data.autostart !== false) {
      data = await processBulkJobBatch({
        companyId: user.companyId,
        userId: user.id,
        jobId: job.id,
        cookie: req.headers.get("cookie") || "",
        origin: req.nextUrl.origin,
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("BULK JOB CREATE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "هەڵەیەک ڕوویدا.",
      },
      { status: 400 }
    );
  }
}
