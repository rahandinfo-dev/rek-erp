import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { runEnterpriseSearch } from "@/lib/search/enterpriseSearch";
import type { SearchModuleFilter, SearchGroup } from "@/lib/search/types";
import { clientKey, rateLimit, RATE_PRESETS } from "@/lib/security/rate-limit";
import { apiRateLimited } from "@/lib/api/response";
import { monitorError } from "@/lib/production/monitor";

const FILTERS = new Set<SearchModuleFilter>([
  "all",
  "products",
  "sales",
  "purchases",
  "invoices",
  "customers",
  "suppliers",
  "warehouses",
  "employees",
  "reports",
  "settings",
]);

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const limited = rateLimit(
      clientKey(req, `search:${user.companyId}`),
      RATE_PRESETS.search
    );
    if (!limited.ok) return apiRateLimited(limited);

    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const filterRaw = (req.nextUrl.searchParams.get("type") || "all").trim();
    const filter = (
      FILTERS.has(filterRaw as SearchModuleFilter) ? filterRaw : "all"
    ) as SearchModuleFilter;

    if (q.length < 1) {
      return NextResponse.json({
        success: true,
        data: {
          query: q,
          groups: [] as SearchGroup[],
          total: 0,
          exactHref: null,
        },
      });
    }

    if (q.length > 80) {
      return NextResponse.json(
        { success: false, message: "گەڕان زۆر درێژە." },
        { status: 400 }
      );
    }

    const data = await runEnterpriseSearch({
      companyId: user.companyId,
      query: q,
      filter,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    monitorError("api.search", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
