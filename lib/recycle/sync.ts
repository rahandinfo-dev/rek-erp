import { db } from "@/lib/prisma/db";
import { getRetentionDays } from "@/lib/recycle/record";

type SyncCandidate = {
  moduleKey: string;
  entityType: string;
  entityId: string;
  name: string;
  deletedAt: Date;
  deletedById: string | null;
};

/**
 * Upsert authoritative rows carrying an explicit trash marker.
 * Safe to call opportunistically on list (bounded).
 */
export async function syncRecycleBinFromDb(
  companyId: string,
  userId?: string | null
): Promise<number> {
  try {
    const retention = await getRetentionDays(companyId, userId);
    const now = Date.now();

    const [
      products,
      customers,
      suppliers,
      warehouses,
      brands,
      categories,
      units,
      employees,
      sales,
      purchases,
      invoices,
      invoiceTemplates,
    ] = await Promise.all([
      db.product.findMany({
        where: { companyId, deletedAt: { not: null } },
        select: { id: true, name: true, deletedAt: true, deletedById: true },
        take: 200,
      }),
      db.customer.findMany({
        where: { companyId, deletedAt: { not: null } },
        select: { id: true, name: true, deletedAt: true, deletedById: true },
        take: 200,
      }),
      db.supplier.findMany({
        where: { companyId, deletedAt: { not: null } },
        select: { id: true, name: true, deletedAt: true, deletedById: true },
        take: 200,
      }),
      db.warehouse.findMany({
        where: { companyId, deletedAt: { not: null } },
        select: { id: true, name: true, deletedAt: true, deletedById: true },
        take: 100,
      }),
      db.brand.findMany({
        where: { companyId, deletedAt: { not: null } },
        select: { id: true, name: true, deletedAt: true, deletedById: true },
        take: 100,
      }),
      db.category.findMany({
        where: { companyId, deletedAt: { not: null } },
        select: { id: true, name: true, deletedAt: true, deletedById: true },
        take: 100,
      }),
      db.unit.findMany({
        where: { companyId, deletedAt: { not: null } },
        select: { id: true, name: true, deletedAt: true, deletedById: true },
        take: 100,
      }),
      db.employee.findMany({
        where: { companyId, deletedAt: { not: null } },
        select: { id: true, fullName: true, deletedAt: true, deletedById: true },
        take: 100,
      }),
      db.sale.findMany({
        where: { companyId, deletedAt: { not: null } },
        select: { id: true, invoiceNo: true, deletedAt: true, deletedById: true },
        take: 200,
      }),
      db.purchase.findMany({
        where: { companyId, deletedAt: { not: null } },
        select: { id: true, invoiceNo: true, deletedAt: true, deletedById: true },
        take: 200,
      }),
      db.invoice.findMany({
        where: { companyId, deletedAt: { not: null } },
        select: { id: true, invoiceNo: true, deletedAt: true, deletedById: true },
        take: 200,
      }),
      db.invoiceTemplate.findMany({
        where: { companyId, deletedAt: { not: null } },
        select: { id: true, name: true, deletedAt: true, deletedById: true },
        take: 100,
      }),
    ]);

    const candidates: SyncCandidate[] = [
      ...products.map((p) => ({
        moduleKey: "products",
        entityType: "Product",
        entityId: p.id,
        name: p.name,
        deletedAt: p.deletedAt!,
        deletedById: p.deletedById,
      })),
      ...customers.map((p) => ({
        moduleKey: "customers",
        entityType: "کڕیار",
        entityId: p.id,
        name: p.name,
        deletedAt: p.deletedAt!,
        deletedById: p.deletedById,
      })),
      ...suppliers.map((p) => ({
        moduleKey: "suppliers",
        entityType: "دابینکەر",
        entityId: p.id,
        name: p.name,
        deletedAt: p.deletedAt!,
        deletedById: p.deletedById,
      })),
      ...warehouses.map((p) => ({
        moduleKey: "warehouses",
        entityType: "کۆگا",
        entityId: p.id,
        name: p.name,
        deletedAt: p.deletedAt!,
        deletedById: p.deletedById,
      })),
      ...brands.map((p) => ({
        moduleKey: "brands",
        entityType: "Brand",
        entityId: p.id,
        name: p.name,
        deletedAt: p.deletedAt!,
        deletedById: p.deletedById,
      })),
      ...categories.map((p) => ({
        moduleKey: "categories",
        entityType: "Category",
        entityId: p.id,
        name: p.name,
        deletedAt: p.deletedAt!,
        deletedById: p.deletedById,
      })),
      ...units.map((p) => ({
        moduleKey: "units",
        entityType: "Unit",
        entityId: p.id,
        name: p.name,
        deletedAt: p.deletedAt!,
        deletedById: p.deletedById,
      })),
      ...employees.map((p) => ({
        moduleKey: "employees",
        entityType: "کارمەند",
        entityId: p.id,
        name: p.fullName,
        deletedAt: p.deletedAt!,
        deletedById: p.deletedById,
      })),
      ...sales.map((p) => ({
        moduleKey: "sales",
        entityType: "Sale",
        entityId: p.id,
        name: p.invoiceNo,
        deletedAt: p.deletedAt!,
        deletedById: p.deletedById,
      })),
      ...purchases.map((p) => ({
        moduleKey: "purchases",
        entityType: "Purchase",
        entityId: p.id,
        name: p.invoiceNo,
        deletedAt: p.deletedAt!,
        deletedById: p.deletedById,
      })),
      ...invoices.map((p) => ({
        moduleKey: "invoices",
        entityType: "پسوولە",
        entityId: p.id,
        name: p.invoiceNo,
        deletedAt: p.deletedAt!,
        deletedById: p.deletedById,
      })),
      ...invoiceTemplates.map((p) => ({
        moduleKey: "invoice-templates",
        entityType: "InvoiceTemplate",
        entityId: p.id,
        name: p.name,
        deletedAt: p.deletedAt!,
        deletedById: p.deletedById,
      })),
    ];

    let upserted = 0;
    for (const c of candidates) {
      const expiresAt = new Date(
        c.deletedAt.getTime() + retention * 86400000
      );
      // Skip creating entries that would already be past retention unless still deleted
      if (expiresAt.getTime() < now - 7 * 86400000) {
        // still sync so UI can show expired + purge options
      }

      const existing = await db.recycleBinEntry.findUnique({
        where: {
          companyId_entityType_entityId: {
            companyId,
            entityType: c.entityType,
            entityId: c.entityId,
          },
        },
      });

      if (existing?.status === "deleted") continue;
      if (existing?.status === "purged") continue;

      await db.recycleBinEntry.upsert({
        where: {
          companyId_entityType_entityId: {
            companyId,
            entityType: c.entityType,
            entityId: c.entityId,
          },
        },
        create: {
          companyId,
          userId: c.deletedById,
          moduleKey: c.moduleKey,
          entityType: c.entityType,
          entityId: c.entityId,
          name: c.name.slice(0, 200),
          status: "deleted",
          deletedAt: c.deletedAt,
          expiresAt,
        },
        update: {
          moduleKey: c.moduleKey,
          userId: c.deletedById,
          name: c.name.slice(0, 200),
          status: "deleted",
          deletedAt: c.deletedAt,
          expiresAt,
          restoredAt: null,
          purgedAt: null,
        },
      });
      upserted += 1;
    }

    return upserted;
  } catch (error) {
    console.error("RECYCLE BIN SYNC ERROR:", error);
    return 0;
  }
}
