import { db } from "@/lib/prisma/db";

export type RelatedCount = { label: string; count: number };

/** Count related business records for delete/purge warnings. */
export async function relatedForEntity(
  companyId: string,
  moduleKey: string,
  entityId: string
): Promise<RelatedCount[]> {
  try {
    switch (moduleKey) {
      case "products": {
        const [sales, purchases, stocks] = await Promise.all([
          db.saleItem.count({
            where: { productId: entityId, sale: { companyId } },
          }),
          db.purchaseItem.count({
            where: { productId: entityId, purchase: { companyId } },
          }),
          db.warehouseStock.count({
            where: { companyId, productId: entityId },
          }),
        ]);
        return [
          { label: "Sale lines", count: sales },
          { label: "Purchase lines", count: purchases },
          { label: "Warehouse stock rows", count: stocks },
        ].filter((r) => r.count > 0);
      }
      case "customers": {
        const [sales, invoices] = await Promise.all([
          db.sale.count({ where: { companyId, customerId: entityId } }),
          db.invoice.count({ where: { companyId, customerId: entityId } }),
        ]);
        return [
          { label: "Sales", count: sales },
          { label: "Invoices", count: invoices },
        ].filter((r) => r.count > 0);
      }
      case "suppliers": {
        const purchases = await db.purchase.count({
          where: { companyId, supplierId: entityId },
        });
        return [{ label: "Purchases", count: purchases }].filter(
          (r) => r.count > 0
        );
      }
      case "warehouses": {
        const [stocks, sales, purchases] = await Promise.all([
          db.warehouseStock.count({
            where: { companyId, warehouseId: entityId },
          }),
          db.sale.count({ where: { companyId, warehouseId: entityId } }),
          db.purchase.count({ where: { companyId, warehouseId: entityId } }),
        ]);
        return [
          { label: "Stock rows", count: stocks },
          { label: "Sales", count: sales },
          { label: "Purchases", count: purchases },
        ].filter((r) => r.count > 0);
      }
      case "categories": {
        const suppliers = await db.supplier.count({
          where: { companyId, categoryId: entityId },
        });
        return [{ label: "Suppliers", count: suppliers }].filter(
          (r) => r.count > 0
        );
      }
      case "units": {
        const products = await db.product.count({
          where: { companyId, unitId: entityId },
        });
        return [{ label: "Products", count: products }].filter(
          (r) => r.count > 0
        );
      }
      case "sales": {
        const invoices = await db.invoice.count({
          where: { companyId, saleId: entityId },
        });
        return [{ label: "Invoices", count: invoices }].filter(
          (r) => r.count > 0
        );
      }
      case "employees": {
        const [attendance, leave, salary] = await Promise.all([
          db.attendance.count({ where: { employeeId: entityId } }),
          db.leaveRequest.count({ where: { employeeId: entityId } }),
          db.salaryPayment.count({ where: { employeeId: entityId } }),
        ]);
        return [
          { label: "Attendance", count: attendance },
          { label: "Leave requests", count: leave },
          { label: "Salary payments", count: salary },
        ].filter((r) => r.count > 0);
      }
      default:
        return [];
    }
  } catch (error) {
    console.error("RECYCLE RELATED ERROR:", error);
    return [];
  }
}

/** True when permanent delete should be blocked by history. */
export function purgeBlockedByRelated(
  moduleKey: string,
  related: RelatedCount[]
): boolean {
  if (["sales", "purchases", "invoices"].includes(moduleKey)) return true;
  return related.some((r) => r.count > 0);
}
