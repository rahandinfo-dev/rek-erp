import { db } from "@/lib/prisma/db";

/** Default units created for every company (Kurdish labels). */
export const DEFAULT_UNITS: Array<{ name: string; symbol: string }> = [
  { name: "دانە", symbol: "pcs" },
  { name: "کیلۆگرام", symbol: "kg" },
  { name: "گرام", symbol: "g" },
  { name: "لیتر", symbol: "L" },
  { name: "سندوق", symbol: "box" },
  { name: "پاکەت", symbol: "pack" },
  { name: "مەتری چوارگۆشە", symbol: "m²" },
  { name: "مەتر", symbol: "m" },
];

/** Ensure company has the standard unit set. Idempotent. */
export async function ensureDefaultUnits(companyId: string) {
  const existing = await db.unit.findMany({
    where: { companyId },
    select: { id: true, name: true, symbol: true, active: true },
  });

  const bySymbol = new Map(
    existing.map((u) => [u.symbol.toLowerCase(), u])
  );
  const byName = new Map(existing.map((u) => [u.name, u]));

  for (const unit of DEFAULT_UNITS) {
    const hit =
      bySymbol.get(unit.symbol.toLowerCase()) || byName.get(unit.name);
    if (hit) {
      if (!hit.active) {
        await db.unit.update({
          where: { id: hit.id },
          data: { active: true },
        });
      }
      continue;
    }
    try {
      await db.unit.create({
        data: {
          companyId,
          name: unit.name,
          symbol: unit.symbol,
          active: true,
        },
      });
    } catch {
      /* unique race — ignore */
    }
  }

  return db.unit.findMany({
    where: { companyId, active: true },
    select: { id: true, name: true, symbol: true },
    orderBy: { name: "asc" },
  });
}
