import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { restoreEntityVersion } from "@/lib/versions/restore";

type Props = { params: Promise<{ id: string }> };

const schema = z.object({
  comment: z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    let comment: string | null = null;
    try {
      const body = await req.json();
      const parsed = schema.safeParse(body);
      if (parsed.success) comment = parsed.data.comment ?? null;
    } catch {
      /* empty body ok */
    }

    const result = await restoreEntityVersion({
      companyId: user.companyId,
      userId: user.id,
      versionId: id,
      comment,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "وەشان گەڕێندرایەوە",
      data: result,
    });
  } catch (error) {
    console.error("RESTORE VERSION ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
