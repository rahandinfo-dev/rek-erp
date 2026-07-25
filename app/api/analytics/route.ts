import { NextResponse } from "next/server";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { getCachedAnalytics } from "@/lib/cache/company-reads";

export async function GET() {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const data = await getCachedAnalytics(companyId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("GET ANALYTICS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
