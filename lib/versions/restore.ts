import { db } from "@/lib/prisma/db";
import { auditSafe } from "@/lib/audit/log";
import { notifySafe } from "@/lib/notifications/create";
import { getVersionById } from "@/lib/versions/query";
import { normalizeEntityType, versionRecordHref } from "@/lib/versions/urls";

function asObj(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

/** Snapshot representing the record at that version point. */
export function snapshotForVersion(row: {
  action: string;
  beforeValue: unknown;
  afterValue: unknown;
}): Record<string, unknown> | null {
  const after = asObj(row.afterValue);
  const before = asObj(row.beforeValue);
  if (row.action === "DELETE") return before || after;
  return after || before;
}

export function canRestoreEntityVersion(row: {
  beforeValue: unknown;
  afterValue: unknown;
  action: string;
}): boolean {
  return Boolean(snapshotForVersion(row));
}

/**
 * Apply a previous version snapshot to the live entity (company-scoped).
 * Creates a new RESTORE version + audit + notification.
 */
export async function restoreEntityVersion(input: {
  companyId: string;
  userId: string;
  versionId: string;
  comment?: string | null;
}): Promise<{ ok: true; entityType: string; entityId: string } | { ok: false; message: string }> {
  const version = await getVersionById(input.companyId, input.versionId);
  if (!version) return { ok: false, message: "Version not found" };

  const snap = snapshotForVersion(version);
  if (!snap) return { ok: false, message: "Version has no restorable snapshot" };

  const entityType = normalizeEntityType(version.entityType);
  const entityId = version.entityId;
  let before: unknown = null;
  let after: unknown = null;

  try {
    switch (entityType) {
      case "Product": {
        const current = await db.product.findFirst({
          where: { id: entityId, companyId: input.companyId },
        });
        if (!current) return { ok: false, message: "Unauthorized or not found" };
        before = {
          name: current.name,
          sku: current.sku,
          barcode: current.barcode,
          salePrice: Number(current.salePrice),
          purchasePrice: Number(current.purchasePrice),
          notes: current.notes,
          active: current.active,
          minimumStock: Number(current.minimumStock),
          maximumStock: Number(current.maximumStock),
        };
        const updated = await db.product.update({
          where: { id: entityId },
          data: {
            ...(typeof snap.name === "string" ? { name: snap.name } : {}),
            ...(typeof snap.sku === "string" ? { sku: snap.sku } : {}),
            ...(snap.barcode !== undefined
              ? { barcode: (snap.barcode as string | null) ?? null }
              : {}),
            ...(snap.salePrice !== undefined
              ? { salePrice: Number(snap.salePrice) }
              : {}),
            ...(snap.purchasePrice !== undefined
              ? { purchasePrice: Number(snap.purchasePrice) }
              : {}),
            ...(snap.notes !== undefined
              ? { notes: (snap.notes as string | null) ?? null }
              : {}),
            ...(typeof snap.active === "boolean" ? { active: snap.active } : {}),
            ...(snap.minimumStock !== undefined
              ? { minimumStock: Number(snap.minimumStock) }
              : {}),
            ...(snap.maximumStock !== undefined
              ? { maximumStock: Number(snap.maximumStock) }
              : {}),
          },
        });
        after = {
          name: updated.name,
          sku: updated.sku,
          barcode: updated.barcode,
          salePrice: Number(updated.salePrice),
          purchasePrice: Number(updated.purchasePrice),
          notes: updated.notes,
          active: updated.active,
          minimumStock: Number(updated.minimumStock),
          maximumStock: Number(updated.maximumStock),
        };
        break;
      }
      case "Customer": {
        const current = await db.customer.findFirst({
          where: { id: entityId, companyId: input.companyId },
        });
        if (!current) return { ok: false, message: "Unauthorized or not found" };
        before = { ...current };
        const updated = await db.customer.update({
          where: { id: entityId },
          data: {
            ...(typeof snap.name === "string" ? { name: snap.name } : {}),
            ...(typeof snap.code === "string" ? { code: snap.code } : {}),
            ...(snap.phone !== undefined
              ? { phone: (snap.phone as string | null) ?? null }
              : {}),
            ...(snap.email !== undefined
              ? { email: (snap.email as string | null) ?? null }
              : {}),
            ...(snap.address !== undefined
              ? { address: (snap.address as string | null) ?? null }
              : {}),
            ...(snap.notes !== undefined
              ? { notes: (snap.notes as string | null) ?? null }
              : {}),
            ...(typeof snap.active === "boolean" ? { active: snap.active } : {}),
          },
        });
        after = updated;
        break;
      }
      case "Supplier": {
        const current = await db.supplier.findFirst({
          where: { id: entityId, companyId: input.companyId },
        });
        if (!current) return { ok: false, message: "Unauthorized or not found" };
        before = { ...current };
        const updated = await db.supplier.update({
          where: { id: entityId },
          data: {
            ...(typeof snap.name === "string" ? { name: snap.name } : {}),
            ...(typeof snap.code === "string" ? { code: snap.code } : {}),
            ...(snap.phone !== undefined
              ? { phone: (snap.phone as string | null) ?? null }
              : {}),
            ...(snap.email !== undefined
              ? { email: (snap.email as string | null) ?? null }
              : {}),
            ...(snap.address !== undefined
              ? { address: (snap.address as string | null) ?? null }
              : {}),
            ...(snap.notes !== undefined
              ? { notes: (snap.notes as string | null) ?? null }
              : {}),
            ...(typeof snap.active === "boolean" ? { active: snap.active } : {}),
          },
        });
        after = updated;
        break;
      }
      case "Warehouse": {
        const current = await db.warehouse.findFirst({
          where: { id: entityId, companyId: input.companyId },
        });
        if (!current) return { ok: false, message: "Unauthorized or not found" };
        before = {
          name: current.name,
          code: current.code,
          address: current.address,
          active: current.active,
        };
        const updated = await db.warehouse.update({
          where: { id: entityId },
          data: {
            ...(typeof snap.name === "string" ? { name: snap.name } : {}),
            ...(typeof snap.code === "string" ? { code: snap.code } : {}),
            ...(snap.address !== undefined
              ? { address: (snap.address as string | null) ?? null }
              : {}),
            ...(typeof snap.active === "boolean" ? { active: snap.active } : {}),
          },
        });
        after = {
          name: updated.name,
          code: updated.code,
          address: updated.address,
          active: updated.active,
        };
        break;
      }
      case "Employee": {
        const current = await db.employee.findFirst({
          where: { id: entityId, companyId: input.companyId },
        });
        if (!current) return { ok: false, message: "Unauthorized or not found" };
        before = {
          fullName: current.fullName,
          phone: current.phone,
          position: current.position,
          department: current.department,
          status: current.status,
        };
        const updated = await db.employee.update({
          where: { id: entityId },
          data: {
            ...(typeof snap.fullName === "string"
              ? { fullName: snap.fullName }
              : {}),
            ...(snap.phone !== undefined
              ? { phone: (snap.phone as string | null) ?? null }
              : {}),
            ...(snap.position !== undefined
              ? { position: (snap.position as string | null) ?? null }
              : {}),
            ...(snap.department !== undefined
              ? { department: (snap.department as string | null) ?? null }
              : {}),
            ...(typeof snap.status === "string"
              ? { status: snap.status as never }
              : {}),
          },
        });
        after = {
          fullName: updated.fullName,
          phone: updated.phone,
          position: updated.position,
          department: updated.department,
          status: updated.status,
        };
        break;
      }
      case "Settings":
      case "Company": {
        const current = await db.company.findFirst({
          where: { id: input.companyId },
        });
        if (!current) return { ok: false, message: "Unauthorized or not found" };
        before = {
          name: current.name,
          phone: current.phone,
          address: current.address,
          website: current.website,
          taxNumber: current.taxNumber,
          invoiceHeader: current.invoiceHeader,
          invoiceFooter: current.invoiceFooter,
        };
        const updated = await db.company.update({
          where: { id: input.companyId },
          data: {
            ...(typeof snap.name === "string" ? { name: snap.name } : {}),
            ...(snap.phone !== undefined
              ? { phone: (snap.phone as string | null) ?? null }
              : {}),
            ...(snap.address !== undefined
              ? { address: (snap.address as string | null) ?? null }
              : {}),
            ...(snap.website !== undefined
              ? { website: (snap.website as string | null) ?? null }
              : {}),
            ...(snap.taxNumber !== undefined
              ? { taxNumber: (snap.taxNumber as string | null) ?? null }
              : {}),
            ...(snap.invoiceHeader !== undefined
              ? {
                  invoiceHeader: (snap.invoiceHeader as string | null) ?? null,
                }
              : {}),
            ...(snap.invoiceFooter !== undefined
              ? {
                  invoiceFooter: (snap.invoiceFooter as string | null) ?? null,
                }
              : {}),
          },
        });
        after = {
          name: updated.name,
          phone: updated.phone,
          address: updated.address,
          website: updated.website,
          taxNumber: updated.taxNumber,
          invoiceHeader: updated.invoiceHeader,
          invoiceFooter: updated.invoiceFooter,
        };
        break;
      }
      case "Sale":
      case "Purchase":
      case "Invoice": {
        // Document entities: restore soft-deleted / cancelled via status fields only
        if (entityType === "Sale") {
          const current = await db.sale.findFirst({
            where: { id: entityId, companyId: input.companyId },
          });
          if (!current) return { ok: false, message: "Unauthorized or not found" };
          before = { status: current.status };
          if (typeof snap.status === "string") {
            after = await db.sale.update({
              where: { id: entityId },
              data: { status: snap.status as never },
              select: { status: true, invoiceNo: true },
            });
          } else {
            return { ok: false, message: "No restorable sale fields in snapshot" };
          }
          break;
        }
        if (entityType === "Purchase") {
          const current = await db.purchase.findFirst({
            where: { id: entityId, companyId: input.companyId },
          });
          if (!current) return { ok: false, message: "Unauthorized or not found" };
          before = { status: current.status };
          if (typeof snap.status === "string") {
            after = await db.purchase.update({
              where: { id: entityId },
              data: { status: snap.status as never },
              select: { status: true, invoiceNo: true },
            });
          } else {
            return {
              ok: false,
              message: "No restorable purchase fields in snapshot",
            };
          }
          break;
        }
        const current = await db.invoice.findFirst({
          where: { id: entityId, companyId: input.companyId },
        });
        if (!current) return { ok: false, message: "Unauthorized or not found" };
        before = { status: current.status };
        if (typeof snap.status === "string") {
          after = await db.invoice.update({
            where: { id: entityId },
            data: { status: snap.status as never },
            select: { status: true, invoiceNo: true },
          });
        } else {
          return {
            ok: false,
            message: "No restorable invoice fields in snapshot",
          };
        }
        break;
      }
      default:
        return {
          ok: false,
          message: `Restore not supported for ${entityType}`,
        };
    }
  } catch (error) {
    console.error("RESTORE ENTITY VERSION ERROR:", error);
    return { ok: false, message: "Restore failed" };
  }

  const comment =
    input.comment ||
    `Restored to v${version.versionNumber} (${version.recordName})`;

  const moduleMap: Record<string, string> = {
    Product: "PRODUCT",
    Customer: "CUSTOMER",
    Supplier: "SUPPLIER",
    Sale: "SALE",
    Purchase: "PURCHASE",
    Invoice: "INVOICE",
    Warehouse: "WAREHOUSE",
    Employee: "EMPLOYEE",
    Settings: "SETTINGS",
    Company: "SETTINGS",
    Expense: "REPORT",
    Report: "REPORT",
  };

  await auditSafe({
    companyId: input.companyId,
    userId: input.userId,
    module: (moduleMap[entityType] || "SYSTEM") as never,
    action: "RESTORE",
    entityType,
    entityId:
      entityType === "Settings" || entityType === "Company"
        ? input.companyId
        : entityId,
    summary: comment,
    oldValue: before,
    newValue: after,
    metadata: {
      restoredFromVersionId: version.id,
      restoredFromVersionNumber: version.versionNumber,
    },
  });

  void notifySafe({
    companyId: input.companyId,
    userId: input.userId,
    title: "Version restored",
    message: comment,
    category: "SYSTEM",
    href: versionRecordHref(entityType, entityId),
    entityType,
    entityId,
    metadata: {
      versionId: version.id,
      versionNumber: version.versionNumber,
    },
  });

  return { ok: true, entityType, entityId };
}
