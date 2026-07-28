import type {
  InventoryTransactionType,
  Prisma,
} from "@/lib/prisma/client";

export type TxClient = Prisma.TransactionClient;

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export type ApplyMovementInput = {
  companyId: string;
  productId: string;
  warehouseId: string;
  /** Positive quantity always. Direction inferred from `type` / `direction`. */
  quantity: number;
  type: InventoryTransactionType;
  /** +1 increase warehouse stock, -1 decrease */
  direction: 1 | -1;
  userId?: string | null;
  reason?: string | null;
  notes?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  referenceNo?: string | null;
  unitCost?: number | null;
  relatedWarehouseId?: string | null;
  /** Allow going below zero (rarely). Default false. */
  allowNegative?: boolean;
  /**
   * Allow quantity 0 (audit-only: product create with no stock,
   * soft-delete / restore without changing balances).
   */
  allowZero?: boolean;
  /**
   * Write InventoryTransaction without changing WarehouseStock / Product.
   * Still records previousQty / newQty (defaults to current balance).
   */
  auditOnly?: boolean;
};

export type ApplyMovementResult = {
  previousQty: number;
  newQty: number;
  productPrevious: number;
  productNew: number;
  transactionId: string;
};

/**
 * Ensure WarehouseStock rows exist for a product (seed main warehouse from Product.currentStock).
 */
export async function ensureProductWarehouseBalance(
  tx: TxClient,
  companyId: string,
  productId: string
) {
  const existing = await tx.warehouseStock.count({
    where: { companyId, productId },
  });
  if (existing > 0) return;

  const [product, mainWh] = await Promise.all([
    tx.product.findFirst({
      where: { id: productId, companyId },
      select: { currentStock: true, reservedStock: true },
    }),
    tx.warehouse.findFirst({
      where: { companyId },
      orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    }),
  ]);

  if (!product || !mainWh) return;

  await tx.warehouseStock.upsert({
    where: {
      productId_warehouseId: {
        productId,
        warehouseId: mainWh.id,
      },
    },
    create: {
      companyId,
      productId,
      warehouseId: mainWh.id,
      quantity: product.currentStock,
      reserved: product.reservedStock,
    },
    update: {},
  });
}

/**
 * Backfill WarehouseStock for an entire company (idempotent).
 */
export async function ensureCompanyWarehouseBalances(
  tx: TxClient,
  companyId: string
) {
  const mainWh = await tx.warehouse.findFirst({
    where: { companyId },
    orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (!mainWh) return { created: 0 };

  const products = await tx.product.findMany({
    where: {
      companyId,
      warehouseStocks: { none: {} },
    },
    select: { id: true, currentStock: true, reservedStock: true },
  });

  if (products.length === 0) return { created: 0 };

  await tx.warehouseStock.createMany({
    data: products.map((p) => ({
      companyId,
      productId: p.id,
      warehouseId: mainWh.id,
      quantity: p.currentStock,
      reserved: p.reservedStock,
    })),
    skipDuplicates: true,
  });

  return { created: products.length };
}

async function syncProductCurrentStock(
  tx: TxClient,
  companyId: string,
  productId: string
) {
  const agg = await tx.warehouseStock.aggregate({
    where: { companyId, productId },
    _sum: { quantity: true },
  });
  const total = num(agg._sum.quantity);
  await tx.product.update({
    where: { id: productId },
    data: { currentStock: total },
  });
  return total;
}

/**
 * Apply a single stock movement: WarehouseStock + Product.currentStock + audit row.
 * History rows are append-only — never updated or deleted by this helper.
 */
export async function applyStockMovement(
  tx: TxClient,
  input: ApplyMovementInput
): Promise<ApplyMovementResult> {
  const qty = Math.abs(num(input.quantity));
  if (qty <= 0 && !input.allowZero && !input.auditOnly) {
    throw new Error("INVALID_QUANTITY");
  }

  await ensureProductWarehouseBalance(tx, input.companyId, input.productId);

  await tx.warehouseStock.upsert({
    where: {
      productId_warehouseId: {
        productId: input.productId,
        warehouseId: input.warehouseId,
      },
    },
    create: {
      companyId: input.companyId,
      productId: input.productId,
      warehouseId: input.warehouseId,
      quantity: 0,
      reserved: 0,
    },
    update: {},
  });

  const balance = await tx.warehouseStock.findUniqueOrThrow({
    where: {
      productId_warehouseId: {
        productId: input.productId,
        warehouseId: input.warehouseId,
      },
    },
  });

  const previousQty = num(balance.quantity);
  const product = await tx.product.findFirst({
    where: { id: input.productId, companyId: input.companyId },
    select: { currentStock: true },
  });
  const productPrevious = num(product?.currentStock);

  if (input.auditOnly) {
    const row = await tx.inventoryTransaction.create({
      data: {
        type: input.type,
        productId: input.productId,
        warehouseId: input.warehouseId,
        quantity: qty,
        previousQty,
        newQty: previousQty,
        unitCost: input.unitCost ?? null,
        referenceId: input.referenceId ?? null,
        referenceType: input.referenceType ?? null,
        referenceNo: input.referenceNo ?? null,
        reason: input.reason ?? null,
        notes: input.notes ?? null,
        userId: input.userId ?? null,
        relatedWarehouseId: input.relatedWarehouseId ?? null,
        companyId: input.companyId,
      },
      select: { id: true },
    });

    return {
      previousQty,
      newQty: previousQty,
      productPrevious,
      productNew: productPrevious,
      transactionId: row.id,
    };
  }

  const delta = input.direction * qty;
  const newQty = previousQty + delta;

  if (!input.allowNegative && newQty < -0.00001) {
    throw new Error("INSUFFICIENT_STOCK");
  }

  if (input.direction < 0) {
    const updated = await tx.warehouseStock.updateMany({
      where: {
        id: balance.id,
        ...(input.allowNegative ? {} : { quantity: { gte: qty } }),
      },
      data: { quantity: { decrement: qty } },
    });

    if (updated.count !== 1) {
      throw new Error("INSUFFICIENT_STOCK");
    }
  } else {
    await tx.warehouseStock.update({
      where: { id: balance.id },
      data: { quantity: { increment: qty } },
    });
  }

  const updatedBalance = await tx.warehouseStock.findUniqueOrThrow({
    where: { id: balance.id },
    select: { quantity: true },
  });
  const actualNewQty = num(updatedBalance.quantity);

  const productNew = await syncProductCurrentStock(
    tx,
    input.companyId,
    input.productId
  );

  const row = await tx.inventoryTransaction.create({
    data: {
      type: input.type,
      productId: input.productId,
      warehouseId: input.warehouseId,
      quantity: qty,
      previousQty,
      newQty: actualNewQty,
      unitCost: input.unitCost ?? null,
      referenceId: input.referenceId ?? null,
      referenceType: input.referenceType ?? null,
      referenceNo: input.referenceNo ?? null,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      userId: input.userId ?? null,
      relatedWarehouseId: input.relatedWarehouseId ?? null,
      companyId: input.companyId,
    },
    select: { id: true },
  });

  return {
    previousQty,
    newQty: actualNewQty,
    productPrevious,
    productNew,
    transactionId: row.id,
  };
}

export function movementDirection(
  type: InventoryTransactionType
): 1 | -1 {
  switch (type) {
    case "SALE":
    case "PURCHASE_RETURN":
    case "TRANSFER_OUT":
    case "PRODUCT_DELETE":
      return -1;
    case "PURCHASE":
    case "SALE_RETURN":
    case "TRANSFER_IN":
    case "PRODUCT_CREATE":
    case "RESTORE":
      return 1;
    case "ADJUSTMENT":
    default:
      return 1;
  }
}
