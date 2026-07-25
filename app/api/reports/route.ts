import { NextRequest, NextResponse } from "next/server";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { buildReports } from "@/lib/reports/buildReports";
import {
  parseGranularity,
  parsePreset,
} from "@/lib/reports/dateRange";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const preset = parsePreset(searchParams.get("preset"));
    const granularity = parseGranularity(searchParams.get("granularity"));
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const data = await buildReports(companyId, {
      preset,
      from,
      to,
      granularity,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET REPORTS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
