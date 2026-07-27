import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getVersionById } from "@/lib/versions/query";
import { canRestoreEntityVersion } from "@/lib/versions/restore";
import { tServer } from "@/lib/i18n";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const { id } = await params;
    const row = await getVersionById(user.companyId, id);
    if (!row) {
      return NextResponse.json(
        { success: false, message: "نەدۆزرایەوە" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...row,
        canRestore: canRestoreEntityVersion(row),
      },
    });
  } catch (error) {
    console.error("GET VERSION ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
