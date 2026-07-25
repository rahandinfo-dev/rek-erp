import type { AnalyticsPayload } from "@/lib/analytics/buildAnalytics";
import { getCachedAnalytics } from "@/lib/cache/company-reads";
import { db } from "@/lib/prisma/db";
import type { AiRecommendation } from "@/lib/ai/types";
import { aiCacheGet, aiCacheKey, aiCacheSet } from "@/lib/ai/cache";

export async function buildRecommendations(
  companyId: string,
  analytics?: AnalyticsPayload
): Promise<AiRecommendation[]> {
  const cacheKey = aiCacheKey(companyId, "recommendations");
  const cached = aiCacheGet<AiRecommendation[]>(cacheKey, 60_000);
  if (cached) return cached;

  const data = analytics || (await getCachedAnalytics(companyId));
  const out: AiRecommendation[] = [];

  for (const p of data.lowStock.slice(0, 5)) {
    out.push({
      id: `restock-${p.id}`,
      kind: "restock",
      title: `Restock ${p.name}`,
      reason: `Stock ${p.currentStock} ≤ minimum ${p.minimumStock}`,
      href: `/dashboard/products/${p.id}`,
      priority: "high",
    });
  }

  for (const p of data.topProducts.slice(0, 3)) {
    out.push({
      id: `best-${p.id}`,
      kind: "best_selling",
      title: `Best seller: ${p.name}`,
      reason: `${p.quantity} units · revenue focus`,
      href: `/dashboard/products/${p.id}`,
      priority: "normal",
    });
  }

  for (const p of data.slowMovingProducts.slice(0, 3)) {
    out.push({
      id: `slow-${p.id}`,
      kind: "slow_moving",
      title: `Slow moving: ${p.name}`,
      reason: "Low recent sales — review pricing or promo",
      href: `/dashboard/products/${p.id}`,
      priority: "low",
    });
  }

  for (const c of data.bestCustomers.slice(0, 3)) {
    out.push({
      id: `cust-${c.id}`,
      kind: "top_customer",
      title: `Top customer: ${c.name}`,
      reason: `${c.orders} orders`,
      href: `/dashboard/customers/${c.id}/edit`,
      priority: "normal",
    });
  }

  for (const s of data.topSuppliers.slice(0, 3)) {
    out.push({
      id: `sup-${s.id}`,
      kind: "top_supplier",
      title: `Top supplier: ${s.name}`,
      reason: `${s.orders} purchases`,
      href: `/dashboard/suppliers/${s.id}/edit`,
      priority: "normal",
    });
  }

  // Frequently purchased together (co-occurrence in recent sales)
  const recentSales = await db.sale.findMany({
    where: { companyId, status: "COMPLETED" },
    select: {
      items: { select: { productId: true, product: { select: { name: true } } }, take: 8 },
    },
    orderBy: { saleDate: "desc" },
    take: 40,
  });
  const pairCounts = new Map<string, { a: string; b: string; n: number; nameA: string; nameB: string }>();
  for (const sale of recentSales) {
    const ids = sale.items.map((i) => ({
      id: i.productId,
      name: i.product.name,
    }));
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i]!;
        const b = ids[j]!;
        const key = [a.id, b.id].sort().join(":");
        const prev = pairCounts.get(key);
        if (prev) prev.n += 1;
        else
          pairCounts.set(key, {
            a: a.id,
            b: b.id,
            n: 1,
            nameA: a.name,
            nameB: b.name,
          });
      }
    }
  }
  const topPairs = [...pairCounts.values()]
    .sort((x, y) => y.n - x.n)
    .slice(0, 2);
  for (const pair of topPairs) {
    if (pair.n < 2) continue;
    out.push({
      id: `pair-${pair.a}-${pair.b}`,
      kind: "purchased_together",
      title: `Often together: ${pair.nameA} + ${pair.nameB}`,
      reason: `Appeared together in ${pair.n} recent sales`,
      href: `/dashboard/products/${pair.a}`,
      priority: "low",
    });
  }

  aiCacheSet(cacheKey, out);
  return out;
}
