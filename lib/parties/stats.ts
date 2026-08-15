import { db } from "@/lib/prisma/db";

export type PartyStats = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  totalPurchases: number;
  outstandingBalance: number;
  lastPurchaseAt: string | null;
};

/** Customer list with sales totals (credit outstanding approximated from CREDIT sales). */
export async function loadCustomerPartyStats(
  companyId: string
): Promise<PartyStats[]> {
  const customers = await db.customer.findMany({
    where: {
      companyId,
      active: true,
      deletedAt: null,
      NOT: { code: { startsWith: "WALKIN-" } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      name: true,
      code: true,
      phone: true,
      email: true,
      active: true,
    },
  });

  if (customers.length === 0) return [];

  const ids = customers.map((c) => c.id);
  const [totals, creditTotals, lastSales] = await Promise.all([
    db.sale.groupBy({
      by: ["customerId"],
      where: { companyId, customerId: { in: ids }, status: "COMPLETED" },
      _sum: { total: true },
      _count: { _all: true },
    }),
    db.sale.groupBy({
      by: ["customerId"],
      where: {
        companyId,
        customerId: { in: ids },
        status: "COMPLETED",
        paymentMethod: "CREDIT",
      },
      _sum: { total: true },
    }),
    db.sale.findMany({
      where: { companyId, customerId: { in: ids }, status: "COMPLETED" },
      orderBy: { saleDate: "desc" },
      distinct: ["customerId"],
      select: { customerId: true, saleDate: true },
    }),
  ]);

  const totalMap = new Map(
    totals.map((t) => [t.customerId, Number(t._sum.total ?? 0)])
  );
  const creditMap = new Map(
    creditTotals.map((t) => [t.customerId, Number(t._sum.total ?? 0)])
  );
  const lastMap = new Map(
    lastSales.map((s) => [s.customerId, s.saleDate.toISOString()])
  );

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    phone: c.phone,
    email: c.email,
    active: c.active,
    totalPurchases: totalMap.get(c.id) ?? 0,
    outstandingBalance: creditMap.get(c.id) ?? 0,
    lastPurchaseAt: lastMap.get(c.id) ?? null,
  }));
}

export async function loadSupplierPartyStats(
  companyId: string
): Promise<PartyStats[]> {
  const suppliers = await db.supplier.findMany({
    where: {
      companyId,
      active: true,
      deletedAt: null,
      NOT: { code: { startsWith: "WALKIN-" } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      name: true,
      code: true,
      phone: true,
      email: true,
      active: true,
    },
  });

  if (suppliers.length === 0) return [];

  const ids = suppliers.map((s) => s.id);
  const [totals, lastPurchases] = await Promise.all([
    db.purchase.groupBy({
      by: ["supplierId"],
      where: { companyId, supplierId: { in: ids }, status: "COMPLETED" },
      _sum: { total: true },
    }),
    db.purchase.findMany({
      where: { companyId, supplierId: { in: ids }, status: "COMPLETED" },
      orderBy: { purchaseDate: "desc" },
      distinct: ["supplierId"],
      select: { supplierId: true, purchaseDate: true },
    }),
  ]);

  const totalMap = new Map(
    totals.map((t) => [t.supplierId, Number(t._sum.total ?? 0)])
  );
  const lastMap = new Map(
    lastPurchases.map((p) => [p.supplierId, p.purchaseDate.toISOString()])
  );

  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    phone: s.phone,
    email: s.email,
    active: s.active,
    totalPurchases: totalMap.get(s.id) ?? 0,
    outstandingBalance: 0,
    lastPurchaseAt: lastMap.get(s.id) ?? null,
  }));
}
