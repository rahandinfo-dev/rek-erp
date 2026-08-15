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
        const [sales, purchases, stocks, movements, transfers] = await Promise.all([
          db.saleItem.count({
            where: { productId: entityId, sale: { companyId } },
          }),
          db.purchaseItem.count({
            where: { productId: entityId, purchase: { companyId } },
          }),
          db.warehouseStock.count({
            where: { companyId, productId: entityId },
          }),
          db.inventoryTransaction.count({
            where: { companyId, productId: entityId },
          }),
          db.stockTransferItem.count({
            where: { productId: entityId, transfer: { companyId } },
          }),
        ]);
        return [
          { label: "Sale lines", count: sales },
          { label: "Purchase lines", count: purchases },
          { label: "Warehouse stock rows", count: stocks },
          { label: "Inventory movements", count: movements },
          { label: "Stock transfers", count: transfers },
        ].filter((r) => r.count > 0);
      }
      case "customers": {
        const [sales, invoices] = await Promise.all([
          db.sale.count({ where: { companyId, customerId: entityId } }),
          db.invoice.count({ where: { companyId, customerId: entityId } }),
        ]);
        return [
          { label: "فرۆشتن", count: sales },
          { label: "پسوولەکان", count: invoices },
        ].filter((r) => r.count > 0);
      }
      case "suppliers": {
        const purchases = await db.purchase.count({
          where: { companyId, supplierId: entityId },
        });
        return [{ label: "کڕین", count: purchases }].filter(
          (r) => r.count > 0
        );
      }
      case "warehouses": {
        const [
          stocks,
          sales,
          purchases,
          invoices,
          movements,
          transfersFrom,
          transfersTo,
        ] = await Promise.all([
          db.warehouseStock.count({
            where: { companyId, warehouseId: entityId },
          }),
          db.sale.count({ where: { companyId, warehouseId: entityId } }),
          db.purchase.count({ where: { companyId, warehouseId: entityId } }),
          db.invoice.count({ where: { companyId, warehouseId: entityId } }),
          db.inventoryTransaction.count({ where: { companyId, warehouseId: entityId } }),
          db.stockTransfer.count({ where: { companyId, fromWarehouseId: entityId } }),
          db.stockTransfer.count({ where: { companyId, toWarehouseId: entityId } }),
        ]);
        return [
          { label: "Stock rows", count: stocks },
          { label: "Invoices", count: invoices },
          { label: "Inventory movements", count: movements },
          { label: "Outgoing transfers", count: transfersFrom },
          { label: "Incoming transfers", count: transfersTo },
          { label: "فرۆشتن", count: sales },
          { label: "کڕین", count: purchases },
        ].filter((r) => r.count > 0);
      }
      case "categories": {
        const suppliers = await db.supplier.count({
          where: { companyId, categoryId: entityId },
        });
        return [{ label: "دابینکەران", count: suppliers }].filter(
          (r) => r.count > 0
        );
      }
      case "units": {
        const products = await db.product.count({
          where: { companyId, unitId: entityId },
        });
        return [{ label: "بەرهەمەکان", count: products }].filter(
          (r) => r.count > 0
        );
      }
      case "sales": {
        const invoices = await db.invoice.count({
          where: { companyId, saleId: entityId },
        });
        return [{ label: "پسوولەکان", count: invoices }].filter(
          (r) => r.count > 0
        );
      }
      case "employees": {
        const [attendance, leave, salary, history, deductions, performances] = await Promise.all([
          db.attendance.count({ where: { companyId, employeeId: entityId } }),
          db.leaveRequest.count({ where: { companyId, employeeId: entityId } }),
          db.salaryPayment.count({ where: { companyId, employeeId: entityId } }),
          db.employeeHistory.count({ where: { companyId, employeeId: entityId } }),
          db.salaryDeduction.count({ where: { companyId, employeeId: entityId } }),
          db.employeePerformance.count({ where: { companyId, employeeId: entityId } }),
        ]);
        return [
          { label: "Attendance", count: attendance },
          { label: "Leave requests", count: leave },
          { label: "Salary payments", count: salary },
          { label: "Employee history", count: history },
          { label: "Salary deductions", count: deductions },
          { label: "Performance reviews", count: performances },
        ].filter((r) => r.count > 0);
      }
      case "invoice-templates": {
        const invoices = await db.invoice.count({
          where: { companyId, templateId: entityId },
        });
        return [{ label: "Invoices", count: invoices }].filter(
          (row) => row.count > 0
        );
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
