import { NextRequest, NextResponse } from "next/server";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import {
  loadInventoryFilterOptions,
  queryInventory,
  type InventorySort,
  type InventoryStatusFilter,
} from "@/lib/inventory/query";

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
    const includeFilters = searchParams.get("includeFilters") === "1";

    const [result, filterOptions] = await Promise.all([
      queryInventory({
        companyId,
        q: searchParams.get("q") || undefined,
        status: (searchParams.get("status") ||
          "all") as InventoryStatusFilter,
        warehouseId: searchParams.get("warehouseId") || undefined,
        unitId: searchParams.get("unitId") || undefined,
        sort: (searchParams.get("sort") || "newest") as InventorySort,
        page: Number(searchParams.get("page") || 1),
        pageSize: Number(searchParams.get("pageSize") || 20),
      }),
      includeFilters
        ? loadInventoryFilterOptions(companyId)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        ...(filterOptions ? { filters: filterOptions } : {}),
      },
    });
  } catch (error) {
    console.error("GET INVENTORY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
