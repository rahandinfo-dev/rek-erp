import { db } from "@/lib/prisma/db";
import type { StockAlertProduct } from "@/components/inventory/StockAlertBanners";

/** Load low / out-of-stock products for read-only alert banners. */
export async function loadStockAlertProducts(
  companyId: string,
  limit = 12
): Promise<StockAlertProduct[]> {
  const rows = await db.$queryRaw<
    Array<{
      id: string;
      name: string;
      currentStock: unknown;
      minimumStock: unknown;
      unitName: string;
      unitSymbol: string | null;
      warehouseName: string;
    }>
  >`
    SELECT
      p.id,
      p.name,
      p."currentStock",
      p."minimumStock",
      u.name AS "unitName",
      u.symbol AS "unitSymbol",
      COALESCE(w.name, 'کۆگا') AS "warehouseName"
    FROM "Product" p
    INNER JOIN "Unit" u ON u.id = p."unitId" AND u."deletedAt" IS NULL
    LEFT JOIN LATERAL (
      SELECT wh.name
      FROM "WarehouseStock" ws
      INNER JOIN "Warehouse" wh ON wh.id = ws."warehouseId"
      WHERE ws."productId" = p.id
        AND ws."companyId" = p."companyId"
        AND wh."deletedAt" IS NULL
      ORDER BY wh."isMain" DESC, ws.quantity::numeric DESC
      LIMIT 1
    ) w ON true
    WHERE p."companyId" = ${companyId}
      AND p.active = true
      AND p."deletedAt" IS NULL
      AND (
        p."currentStock"::numeric <= 0
        OR (
          p."minimumStock"::numeric > 0
          AND p."currentStock"::numeric > 0
          AND p."currentStock"::numeric <= p."minimumStock"::numeric
        )
      )
    ORDER BY p."currentStock"::numeric ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => {
    const current = Number(row.currentStock);
    return {
      id: row.id,
      name: row.name,
      currentStock: current,
      minimumStock: Number(row.minimumStock),
      unit: row.unitSymbol || row.unitName,
      warehouseName: row.warehouseName,
      kind: current <= 0 ? ("out" as const) : ("low" as const),
    };
  });
}
