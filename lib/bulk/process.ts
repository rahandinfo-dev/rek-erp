import { db } from "@/lib/prisma/db";
import type { Prisma } from "@/lib/prisma/client";
import { entityTypeFor } from "@/lib/bulk/modules";
import { upsertEntityMeta, getEntityMeta } from "@/lib/bulk/meta";
import type { BulkPayload } from "@/lib/bulk/types";
import { tServer } from "@/lib/i18n";

const t = tServer.t.bind(tServer);

export type ProcessCtx = {
  companyId: string;
  userId: string;
  moduleKey: string;
  action: string;
  payload: BulkPayload;
};

export type ProcessResult = {
  status: "success" | "failed" | "skipped";
  message?: string;
  before?: unknown;
  after?: unknown;
  exportRow?: Record<string, string | number | null>;
  undo?: unknown;
};

async function assertOwned(
  companyId: string,
  moduleKey: string,
  entityId: string
): Promise<{ ok: true; label: string; row: Record<string, unknown> } | { ok: false; message: string }> {
  switch (moduleKey) {
    case "products": {
      const row = await db.product.findFirst({
        where: { id: entityId, companyId },
        select: {
          id: true,
          name: true,
          sku: true,
          active: true,
          notes: true,
          salePrice: true,
          purchasePrice: true,
          unitId: true,
        },
      });
      if (!row) return { ok: false, message: t('errors.unauthorizedOrMissing') };
      return { ok: true, label: row.name, row: row as unknown as Record<string, unknown> };
    }
    case "customers": {
      const row = await db.customer.findFirst({
        where: { id: entityId, companyId },
      });
      if (!row) return { ok: false, message: t('errors.unauthorizedOrMissing') };
      return { ok: true, label: row.name, row: row as unknown as Record<string, unknown> };
    }
    case "suppliers": {
      const row = await db.supplier.findFirst({
        where: { id: entityId, companyId },
      });
      if (!row) return { ok: false, message: t('errors.unauthorizedOrMissing') };
      return { ok: true, label: row.name, row: row as unknown as Record<string, unknown> };
    }
    case "warehouses": {
      const row = await db.warehouse.findFirst({
        where: { id: entityId, companyId },
      });
      if (!row) return { ok: false, message: t('errors.unauthorizedOrMissing') };
      return { ok: true, label: row.name, row: row as unknown as Record<string, unknown> };
    }
    case "categories": {
      const row = await db.category.findFirst({
        where: { id: entityId, companyId },
      });
      if (!row) return { ok: false, message: t('errors.unauthorizedOrMissing') };
      return { ok: true, label: row.name, row: row as unknown as Record<string, unknown> };
    }
    case "brands": {
      const row = await db.brand.findFirst({
        where: { id: entityId, companyId },
      });
      if (!row) return { ok: false, message: t('errors.unauthorizedOrMissing') };
      return { ok: true, label: row.name, row: row as unknown as Record<string, unknown> };
    }
    case "units": {
      const row = await db.unit.findFirst({
        where: { id: entityId, companyId },
      });
      if (!row) return { ok: false, message: t('errors.unauthorizedOrMissing') };
      return { ok: true, label: row.name, row: row as unknown as Record<string, unknown> };
    }
    case "employees": {
      const row = await db.employee.findFirst({
        where: { id: entityId, companyId },
      });
      if (!row) return { ok: false, message: t('errors.unauthorizedOrMissing') };
      return {
        ok: true,
        label: row.fullName,
        row: row as unknown as Record<string, unknown>,
      };
    }
    case "sales": {
      const row = await db.sale.findFirst({
        where: { id: entityId, companyId },
        include: { customer: { select: { name: true } } },
      });
      if (!row) return { ok: false, message: t('errors.unauthorizedOrMissing') };
      return {
        ok: true,
        label: row.invoiceNo,
        row: row as unknown as Record<string, unknown>,
      };
    }
    case "purchases": {
      const row = await db.purchase.findFirst({
        where: { id: entityId, companyId },
        include: { supplier: { select: { name: true } } },
      });
      if (!row) return { ok: false, message: t('errors.unauthorizedOrMissing') };
      return {
        ok: true,
        label: row.invoiceNo,
        row: row as unknown as Record<string, unknown>,
      };
    }
    case "invoices": {
      const row = await db.invoice.findFirst({
        where: { id: entityId, companyId },
      });
      if (!row) return { ok: false, message: t('errors.unauthorizedOrMissing') };
      return {
        ok: true,
        label: row.invoiceNo,
        row: row as unknown as Record<string, unknown>,
      };
    }
    default:
      return { ok: false, message: t('bulk.moduleUnsupported', { module: moduleKey }) };
  }
}

function toExportRow(
  moduleKey: string,
  row: Record<string, unknown>
): Record<string, string | number | null> {
  const base: Record<string, string | number | null> = {
    id: String(row.id ?? ""),
  };
  if (moduleKey === "products") {
    return {
      ...base,
      name: String(row.name ?? ""),
      sku: String(row.sku ?? ""),
      active: row.active ? "yes" : "no",
      salePrice: Number(row.salePrice ?? 0),
    };
  }
  if (moduleKey === "customers" || moduleKey === "suppliers") {
    return {
      ...base,
      name: String(row.name ?? ""),
      code: String(row.code ?? ""),
      phone: (row.phone as string) || "",
      email: (row.email as string) || "",
      active: row.active ? "yes" : "no",
    };
  }
  if (moduleKey === "sales" || moduleKey === "purchases" || moduleKey === "invoices") {
    return {
      ...base,
      invoiceNo: String(row.invoiceNo ?? ""),
      status: String(row.status ?? ""),
      total: Number(row.total ?? 0),
    };
  }
  if (moduleKey === "employees") {
    return {
      ...base,
      fullName: String(row.fullName ?? ""),
      username: String(row.username ?? ""),
      status: String(row.status ?? ""),
    };
  }
  return {
    ...base,
    name: String(row.name ?? row.fullName ?? row.invoiceNo ?? ""),
  };
}

export async function processBulkItem(
  ctx: ProcessCtx,
  entityId: string
): Promise<ProcessResult> {
  const owned = await assertOwned(ctx.companyId, ctx.moduleKey, entityId);
  if (!owned.ok) {
    return { status: "skipped", message: owned.message };
  }

  const { label, row } = owned;
  const entityType = entityTypeFor(ctx.moduleKey);
  const action = ctx.action;
  const payload = ctx.payload || {};

  try {
    if (
      action === "export_csv" ||
      action === "export_excel" ||
      action === "export_pdf" ||
      action === "print"
    ) {
      return {
        status: "success",
        message: action === "print" ? "بۆ چاپکردن خرایە سەر ڕیز" : "هەناردە کرا",
        exportRow: toExportRow(ctx.moduleKey, row),
        before: { id: entityId, label },
      };
    }

    if (action === "add_tags") {
      const tags = payload.tags || [];
      if (tags.length === 0) {
        return { status: "skipped", message: t('bulk.noTags') };
      }
      const before = await getEntityMeta(ctx.companyId, entityType, entityId);
      await upsertEntityMeta(ctx.companyId, entityType, entityId, { tags });
      return {
        status: "success",
        message: t('bulk.tagsAdded', { label }),
        before: { tags: before?.tags },
        after: { tags },
        undo: { tags: before?.tags ?? [] },
      };
    }

    if (action === "archive" || action === "unarchive") {
      const archived = action === "archive";
      const before = await getEntityMeta(ctx.companyId, entityType, entityId);
      await upsertEntityMeta(ctx.companyId, entityType, entityId, { archived });
      return {
        status: "success",
        message: archived ? t('bulk.archived', { label }) : t('bulk.unarchived', { label }),
        before: { archived: before?.archived ?? false },
        after: { archived },
        undo: { archived: before?.archived ?? false },
      };
    }

    if (action === "delete") {
      return await softDeleteOne(ctx, entityId, label, row);
    }

    if (action === "restore") {
      return await restoreOne(ctx, entityId, label, row);
    }

    if (action === "change_status") {
      return await changeStatusOne(ctx, entityId, label, row, payload);
    }

    if (action === "assign_category") {
      if (ctx.moduleKey !== "suppliers") {
        return { status: "skipped", message: t('bulk.categoryUnsupported') };
      }
      if (payload.categoryId === undefined) {
        return { status: "skipped", message: t('bulk.categoryIdRequired') };
      }
      const before = { categoryId: row.categoryId ?? null };
      await db.supplier.update({
        where: { id: entityId },
        data: { categoryId: payload.categoryId },
      });
      return {
        status: "success",
        message: t('bulk.categoryAssigned', { label }),
        before,
        after: { categoryId: payload.categoryId },
        undo: before,
      };
    }

    if (action === "move") {
      // Move == assign category for suppliers
      if (ctx.moduleKey === "suppliers") {
        return processBulkItem(
          { ...ctx, action: "assign_category" },
          entityId
        );
      }
      return { status: "skipped", message: t('bulk.moveUnsupported') };
    }

    if (action === "assign_warehouse") {
      if (ctx.moduleKey === "purchases") {
        if (!payload.warehouseId) {
          return { status: "skipped", message: t('bulk.warehouseIdRequired') };
        }
        if (row.status === "COMPLETED") {
          return {
            status: "skipped",
            message: t('bulk.cannotMoveCompleted'),
          };
        }
        const before = { warehouseId: row.warehouseId };
        await db.purchase.update({
          where: { id: entityId },
          data: { warehouseId: payload.warehouseId },
        });
        return {
          status: "success",
          message: t('bulk.warehouseUpdated', { label }),
          before,
          after: { warehouseId: payload.warehouseId },
          undo: before,
        };
      }
      if (ctx.moduleKey === "products") {
        // Metadata only — does not move stock balances
        await upsertEntityMeta(ctx.companyId, entityType, entityId, {
          tags: payload.warehouseId
            ? [`warehouse:${payload.warehouseId}`]
            : undefined,
        });
        return {
          status: "success",
          message: t('bulk.warehouseTagged', { label }),
          after: { warehouseId: payload.warehouseId },
        };
      }
      return { status: "skipped", message: t('bulk.warehouseUnsupported') };
    }

    if (action === "edit") {
      return await editOne(ctx, entityId, label, row, payload);
    }

    if (action === "duplicate") {
      return await duplicateOne(ctx, entityId, label, row);
    }

    return { status: "skipped", message: t('bulk.unknownAction', { action }) };
  } catch (error) {
    console.error("BULK ITEM ERROR:", error);
    return {
      status: "failed",
      message: error instanceof Error ? error.message : t('bulk.processingFailed'),
    };
  }
}

async function softDeleteOne(
  ctx: ProcessCtx,
  entityId: string,
  label: string,
  row: Record<string, unknown>
): Promise<ProcessResult> {
  switch (ctx.moduleKey) {
    case "products":
    case "customers":
    case "suppliers":
    case "warehouses":
    case "categories":
    case "brands":
    case "units": {
      if (row.active === false) {
        return { status: "skipped", message: t('bulk.alreadyDeleted') };
      }
      if (ctx.moduleKey === "warehouses" && row.isMain) {
        return { status: "skipped", message: t('bulk.cannotDeleteMain') };
      }
      const model = ctx.moduleKey;
      if (model === "products") {
        await db.product.update({
          where: { id: entityId },
          data: { active: false },
        });
      } else if (model === "customers") {
        await db.customer.update({
          where: { id: entityId },
          data: { active: false },
        });
      } else if (model === "suppliers") {
        await db.supplier.update({
          where: { id: entityId },
          data: { active: false },
        });
      } else if (model === "warehouses") {
        await db.warehouse.update({
          where: { id: entityId },
          data: { active: false },
        });
      } else if (model === "categories") {
        await db.category.update({
          where: { id: entityId },
          data: { active: false },
        });
      } else if (model === "brands") {
        await db.brand.update({
          where: { id: entityId },
          data: { active: false },
        });
      } else if (model === "units") {
        await db.unit.update({
          where: { id: entityId },
          data: { active: false },
        });
      }
      return {
        status: "success",
        message: t('bulk.softDeleted', { label }),
        before: { active: true },
        after: { active: false },
        undo: { action: "restore" },
      };
    }
    case "employees": {
      if (row.status === "INACTIVE") {
        return { status: "skipped", message: t('bulk.alreadyInactive') };
      }
      await db.employee.update({
        where: { id: entityId },
        data: { status: "INACTIVE" },
      });
      return {
        status: "success",
        message: t('bulk.deactivated', { label }),
        before: { status: row.status },
        after: { status: "INACTIVE" },
        undo: { status: row.status },
      };
    }
    case "sales": {
      if (row.status === "CANCELLED") {
        return { status: "skipped", message: t('bulk.alreadyCancelled') };
      }
      await db.sale.update({
        where: { id: entityId },
        data: { status: "CANCELLED" },
      });
      await db.invoice.updateMany({
        where: { saleId: entityId, companyId: ctx.companyId },
        data: { status: "VOID" },
      });
      return {
        status: "success",
        message: t('bulk.cancelledItem', { label }),
        before: { status: row.status },
        after: { status: "CANCELLED" },
        undo: { status: row.status },
      };
    }
    case "purchases": {
      if (row.status === "CANCELLED") {
        return { status: "skipped", message: t('bulk.alreadyCancelled') };
      }
      await db.purchase.update({
        where: { id: entityId },
        data: { status: "CANCELLED" },
      });
      return {
        status: "success",
        message: t('bulk.cancelledItem', { label }),
        before: { status: row.status },
        after: { status: "CANCELLED" },
        undo: { status: row.status },
      };
    }
    case "invoices": {
      if (row.status === "VOID") {
        return { status: "skipped", message: t('bulk.alreadyVoid') };
      }
      await db.invoice.update({
        where: { id: entityId },
        data: { status: "VOID" },
      });
      const saleId = row.saleId as string | undefined;
      if (saleId) {
        await db.sale.update({
          where: { id: saleId },
          data: { status: "CANCELLED" },
        });
      }
      return {
        status: "success",
        message: t('bulk.voided', { label }),
        before: { status: row.status },
        after: { status: "VOID" },
        undo: { status: row.status, saleId },
      };
    }
    default:
      return { status: "skipped", message: t('bulk.deleteUnsupported') };
  }
}

async function restoreOne(
  ctx: ProcessCtx,
  entityId: string,
  label: string,
  row: Record<string, unknown>
): Promise<ProcessResult> {
  switch (ctx.moduleKey) {
    case "products":
    case "customers":
    case "suppliers":
    case "warehouses":
    case "categories":
    case "brands":
    case "units": {
      if (row.active === true) {
        return { status: "skipped", message: t('bulk.alreadyActive') };
      }
      const data = { active: true };
      if (ctx.moduleKey === "products")
        await db.product.update({ where: { id: entityId }, data });
      else if (ctx.moduleKey === "customers")
        await db.customer.update({ where: { id: entityId }, data });
      else if (ctx.moduleKey === "suppliers")
        await db.supplier.update({ where: { id: entityId }, data });
      else if (ctx.moduleKey === "warehouses")
        await db.warehouse.update({ where: { id: entityId }, data });
      else if (ctx.moduleKey === "categories")
        await db.category.update({ where: { id: entityId }, data });
      else if (ctx.moduleKey === "brands")
        await db.brand.update({ where: { id: entityId }, data });
      else if (ctx.moduleKey === "units")
        await db.unit.update({ where: { id: entityId }, data });
      return {
        status: "success",
        message: t('bulk.restoredItem', { label }),
        before: { active: false },
        after: { active: true },
      };
    }
    case "employees": {
      if (row.status === "ACTIVE") {
        return { status: "skipped", message: t('bulk.alreadyActive') };
      }
      await db.employee.update({
        where: { id: entityId },
        data: { status: "ACTIVE" },
      });
      return {
        status: "success",
        message: t('bulk.restoredItem', { label }),
        before: { status: row.status },
        after: { status: "ACTIVE" },
      };
    }
    case "sales": {
      if (row.status !== "CANCELLED") {
        return { status: "skipped", message: t('bulk.notCancelled') };
      }
      await db.sale.update({
        where: { id: entityId },
        data: { status: "COMPLETED" },
      });
      await db.invoice.updateMany({
        where: { saleId: entityId, companyId: ctx.companyId },
        data: { status: "ACTIVE" },
      });
      return {
        status: "success",
        message: t('bulk.restoredItem', { label }),
        before: { status: "CANCELLED" },
        after: { status: "COMPLETED" },
      };
    }
    case "purchases": {
      if (row.status !== "CANCELLED") {
        return { status: "skipped", message: t('bulk.notCancelled') };
      }
      await db.purchase.update({
        where: { id: entityId },
        data: { status: "COMPLETED" },
      });
      return {
        status: "success",
        message: t('bulk.restoredItem', { label }),
        before: { status: "CANCELLED" },
        after: { status: "COMPLETED" },
      };
    }
    case "invoices": {
      if (row.status !== "VOID") {
        return { status: "skipped", message: t('bulk.notVoid') };
      }
      await db.invoice.update({
        where: { id: entityId },
        data: { status: "ACTIVE" },
      });
      const saleId = row.saleId as string | undefined;
      if (saleId) {
        await db.sale.update({
          where: { id: saleId },
          data: { status: "COMPLETED" },
        });
      }
      return {
        status: "success",
        message: t('bulk.restoredItem', { label }),
        before: { status: "VOID" },
        after: { status: "ACTIVE" },
      };
    }
    default:
      return { status: "skipped", message: t('bulk.restoreUnsupported') };
  }
}

async function changeStatusOne(
  ctx: ProcessCtx,
  entityId: string,
  label: string,
  row: Record<string, unknown>,
  payload: BulkPayload
): Promise<ProcessResult> {
  if (
    ["products", "customers", "suppliers", "warehouses", "categories", "brands", "units"].includes(
      ctx.moduleKey
    )
  ) {
    if (payload.active === undefined && payload.status === undefined) {
      return { status: "skipped", message: t('bulk.statusRequired') };
    }
    const active =
      payload.active !== undefined
        ? payload.active
        : payload.status === "active" || payload.status === "ACTIVE";
    const before = { active: row.active };
    const data = { active };
    if (ctx.moduleKey === "products")
      await db.product.update({ where: { id: entityId }, data });
    else if (ctx.moduleKey === "customers")
      await db.customer.update({ where: { id: entityId }, data });
    else if (ctx.moduleKey === "suppliers")
      await db.supplier.update({ where: { id: entityId }, data });
    else if (ctx.moduleKey === "warehouses")
      await db.warehouse.update({ where: { id: entityId }, data });
    else if (ctx.moduleKey === "categories")
      await db.category.update({ where: { id: entityId }, data });
    else if (ctx.moduleKey === "brands")
      await db.brand.update({ where: { id: entityId }, data });
    else if (ctx.moduleKey === "units")
      await db.unit.update({ where: { id: entityId }, data });
    return {
      status: "success",
      message: t('bulk.statusUpdated', { label }),
      before,
      after: data,
      undo: before,
    };
  }

  if (ctx.moduleKey === "employees") {
    const status = payload.status;
    if (!status || !["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
      return { status: "skipped", message: t('bulk.invalidEmployeeStatus') };
    }
    const before = { status: row.status };
    await db.employee.update({
      where: { id: entityId },
      data: { status: status as "ACTIVE" | "INACTIVE" | "SUSPENDED" },
    });
    return {
      status: "success",
      message: t('bulk.statusSet', { status }),
      before,
      after: { status },
      undo: before,
    };
  }

  if (ctx.moduleKey === "sales") {
    const status = payload.status;
    if (!status || !["DRAFT", "COMPLETED", "CANCELLED"].includes(status)) {
      return { status: "skipped", message: t('bulk.invalidSaleStatus') };
    }
    const before = { status: row.status };
    await db.sale.update({
      where: { id: entityId },
      data: { status: status as "DRAFT" | "COMPLETED" | "CANCELLED" },
    });
    return {
      status: "success",
      message: t('bulk.statusSet', { status }),
      before,
      after: { status },
      undo: before,
    };
  }

  if (ctx.moduleKey === "purchases") {
    const status = payload.status;
    if (!status || !["DRAFT", "COMPLETED", "CANCELLED"].includes(status)) {
      return { status: "skipped", message: t('bulk.invalidPurchaseStatus') };
    }
    const before = { status: row.status };
    await db.purchase.update({
      where: { id: entityId },
      data: { status: status as "DRAFT" | "COMPLETED" | "CANCELLED" },
    });
    return {
      status: "success",
      message: t('bulk.statusSet', { status }),
      before,
      after: { status },
      undo: before,
    };
  }

  if (ctx.moduleKey === "invoices") {
    const status = payload.status;
    if (!status || !["ACTIVE", "VOID"].includes(status)) {
      return { status: "skipped", message: t('bulk.invalidInvoiceStatus') };
    }
    const before = { status: row.status };
    await db.invoice.update({
      where: { id: entityId },
      data: { status: status as "ACTIVE" | "VOID" },
    });
    return {
      status: "success",
      message: t('bulk.statusSet', { status }),
      before,
      after: { status },
      undo: before,
    };
  }

  return { status: "skipped", message: t('bulk.statusUnsupported') };
}

async function editOne(
  ctx: ProcessCtx,
  entityId: string,
  label: string,
  row: Record<string, unknown>,
  payload: BulkPayload
): Promise<ProcessResult> {
  const fields = payload.fields || {};
  if (Object.keys(fields).length === 0) {
    return { status: "skipped", message: t('bulk.noFieldsToEdit') };
  }

  // Only allow safe string/number patches
  const allowedKeys = ["notes", "phone", "email", "address", "description"];
  const data: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (key in fields && typeof fields[key] === "string") {
      data[key] = fields[key];
    }
  }
  if (Object.keys(data).length === 0) {
    return { status: "skipped", message: t('bulk.noEditableFields') };
  }

  const before: Record<string, unknown> = {};
  for (const k of Object.keys(data)) before[k] = row[k] ?? null;

  if (ctx.moduleKey === "products") {
    await db.product.update({
      where: { id: entityId },
      data: data as Prisma.ProductUpdateInput,
    });
  } else if (ctx.moduleKey === "customers") {
    await db.customer.update({
      where: { id: entityId },
      data: data as Prisma.CustomerUpdateInput,
    });
  } else if (ctx.moduleKey === "suppliers") {
    await db.supplier.update({
      where: { id: entityId },
      data: data as Prisma.SupplierUpdateInput,
    });
  } else if (ctx.moduleKey === "warehouses") {
    await db.warehouse.update({
      where: { id: entityId },
      data: data as Prisma.WarehouseUpdateInput,
    });
  } else if (ctx.moduleKey === "categories") {
    await db.category.update({
      where: { id: entityId },
      data: data as Prisma.CategoryUpdateInput,
    });
  } else if (ctx.moduleKey === "employees") {
    await db.employee.update({
      where: { id: entityId },
      data: data as Prisma.EmployeeUpdateInput,
    });
  } else {
    return { status: "skipped", message: t('bulk.editUnsupported') };
  }

  return {
    status: "success",
    message: t('bulk.updatedItem', { label }),
    before,
    after: data,
    undo: before,
  };
}

async function duplicateOne(
  ctx: ProcessCtx,
  entityId: string,
  label: string,
  row: Record<string, unknown>
): Promise<ProcessResult> {
  const suffix = ` (copy ${Date.now().toString(36).slice(-4)})`;

  if (ctx.moduleKey === "customers") {
    const code = `${String(row.code).slice(0, 40)}-C${Date.now().toString(36).slice(-3)}`;
    const created = await db.customer.create({
      data: {
        companyId: ctx.companyId,
        name: `${String(row.name)}${suffix}`,
        code,
        phone: (row.phone as string) || null,
        email: (row.email as string) || null,
        address: (row.address as string) || null,
        notes: (row.notes as string) || null,
        active: true,
      },
    });
    return {
      status: "success",
      message: t('bulk.duplicatedItem', { label }),
      after: { id: created.id, code },
    };
  }

  if (ctx.moduleKey === "suppliers") {
    const code = `${String(row.code).slice(0, 40)}-C${Date.now().toString(36).slice(-3)}`;
    const created = await db.supplier.create({
      data: {
        companyId: ctx.companyId,
        name: `${String(row.name)}${suffix}`,
        code,
        phone: (row.phone as string) || null,
        email: (row.email as string) || null,
        address: (row.address as string) || null,
        notes: (row.notes as string) || null,
        categoryId: (row.categoryId as string) || null,
        active: true,
      },
    });
    return {
      status: "success",
      message: t('bulk.duplicatedItem', { label }),
      after: { id: created.id, code },
    };
  }

  if (ctx.moduleKey === "categories") {
    const created = await db.category.create({
      data: {
        companyId: ctx.companyId,
        name: `${String(row.name)}${suffix}`,
        description: (row.description as string) || null,
        active: true,
      },
    });
    return {
      status: "success",
      message: t('bulk.duplicatedItem', { label }),
      after: { id: created.id },
    };
  }

  if (ctx.moduleKey === "brands") {
    const created = await db.brand.create({
      data: {
        companyId: ctx.companyId,
        name: `${String(row.name)}${suffix}`,
        active: true,
      },
    });
    return {
      status: "success",
      message: t('bulk.duplicatedItem', { label }),
      after: { id: created.id },
    };
  }

  if (ctx.moduleKey === "units") {
    const created = await db.unit.create({
      data: {
        companyId: ctx.companyId,
        name: `${String(row.name)}${suffix}`,
        symbol: `${String(row.symbol).slice(0, 8)}${Date.now().toString(36).slice(-2)}`,
        active: true,
      },
    });
    return {
      status: "success",
      message: t('bulk.duplicatedItem', { label }),
      after: { id: created.id },
    };
  }

  if (ctx.moduleKey === "products") {
    const sku = `${String(row.sku).slice(0, 40)}-C${Date.now().toString(36).slice(-3)}`;
    const created = await db.product.create({
      data: {
        companyId: ctx.companyId,
        unitId: String(row.unitId),
        name: `${String(row.name)}${suffix}`,
        sku,
        notes: (row.notes as string) || null,
        salePrice: Number(row.salePrice ?? 0),
        purchasePrice: Number(row.purchasePrice ?? 0),
        active: true,
      },
    });
    return {
      status: "success",
      message: t('bulk.duplicatedItem', { label }),
      after: { id: created.id, sku },
    };
  }

  if (ctx.moduleKey === "invoices") {
    return {
      status: "success",
      message: t('bulk.duplicateViaInvoice'),
      after: { duplicateHref: `/dashboard/sales/new?duplicate=${entityId}` },
    };
  }

  return { status: "skipped", message: t('bulk.duplicateUnsupported') };
}
