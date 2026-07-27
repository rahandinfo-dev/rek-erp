import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { compareValues } from "@/lib/audit/diff";
import { getVersionById } from "@/lib/versions/query";
import { snapshotForVersion } from "@/lib/versions/restore";
import { tServer } from "@/lib/i18n";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: tServer.t("api.unauthorized") },
        { status: 401 }
      );
    }

    const a = req.nextUrl.searchParams.get("a");
    const b = req.nextUrl.searchParams.get("b");
    if (!a || !b) {
      return NextResponse.json(
        { success: false, message: "Provide a and b version ids" },
        { status: 400 }
      );
    }

    const [left, right] = await Promise.all([
      getVersionById(user.companyId, a),
      getVersionById(user.companyId, b),
    ]);

    if (!left || !right) {
      return NextResponse.json(
        { success: false, message: "Version not found" },
        { status: 404 }
      );
    }

    if (
      left.entityType !== right.entityType ||
      left.entityId !== right.entityId
    ) {
      return NextResponse.json(
        { success: false, message: "Versions must belong to the same record" },
        { status: 400 }
      );
    }

    const leftSnap = snapshotForVersion(left);
    const rightSnap = snapshotForVersion(right);
    const diffs = compareValues(leftSnap, rightSnap);

    return NextResponse.json({
      success: true,
      data: {
        left,
        right,
        diffs: diffs.map((d) => ({
          field: d.field,
          before: d.before,
          after: d.after,
          kind:
            d.before === undefined || d.before === null
              ? "added"
              : d.after === undefined || d.after === null
                ? "removed"
                : "modified",
        })),
      },
    });
  } catch (error) {
    console.error("COMPARE VERSIONS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
