import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { processBulkJobBatch } from "@/lib/bulk/job";
import { tServer } from "@/lib/i18n";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const { id } = await params;
    const data = await processBulkJobBatch({
      companyId: user.companyId,
      userId: user.id,
      jobId: id,
      cookie: req.headers.get("cookie") || "",
      origin: req.nextUrl.origin,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("BULK PROCESS ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "هەڵەیەک ڕوویدا.",
      },
      { status: 400 }
    );
  }
}
