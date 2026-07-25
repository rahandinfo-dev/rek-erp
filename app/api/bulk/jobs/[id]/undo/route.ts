import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { undoBulkJob } from "@/lib/bulk/job";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const result = await undoBulkJob({
      companyId: user.companyId,
      userId: user.id,
      jobId: id,
      cookie: req.headers.get("cookie") || "",
      origin: req.nextUrl.origin,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("BULK UNDO ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "هەڵەیەک ڕوویدا.",
      },
      { status: 400 }
    );
  }
}
