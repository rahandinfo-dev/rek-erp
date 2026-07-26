import { Prisma } from "@/lib/prisma/client";
import type { InventoryTransactionType } from "@/lib/prisma/client";
import { db } from "@/lib/prisma/db";
import { splitDateTime as formatDateTimeParts } from "@/lib/utils/datetime";

export type MovementHistoryRow = {
  id: string;
  type: InventoryTransactionType;
  quantity: number;
  previousQty: number | null;
  newQty: number | null;
  reason: string | null;
  notes: string | null;
  referenceNo: string | null;
  referenceType: string | null;
  createdAt: string;
  date: string;
  time: string;
  product: { id: string; name: string; sku: string; active: boolean };
  warehouse: { id: string; name: string; code: string };
  userName: string | null;
  userId: string | null;
};

export type MovementHistoryQuery = {
  companyId: string;
  q?: string;
  type?: InventoryTransactionType | "";
  productId?: string;
  warehouseId?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function splitDateTime(d: Date) {
  return {
    ...formatDateTimeParts(d),
    createdAt: d.toISOString(),
  };
}

const MOVEMENT_TYPES = new Set<string>([
  "PURCHASE",
  "SALE",
  "SALE_RETURN",
  "PURCHASE_RETURN",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "ADJUSTMENT",
  "PRODUCT_CREATE",
  "PRODUCT_DELETE",
  "RESTORE",
]);

export async function queryMovementHistory(input: MovementHistoryQuery) {
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize || 25));
  const q = (input.q || "").trim();

  const where: Prisma.InventoryTransactionWhereInput = {
    companyId: input.companyId,
  };

  if (input.type && MOVEMENT_TYPES.has(input.type)) {
    where.type = input.type;
  }
  if (input.productId) where.productId = input.productId;
  if (input.warehouseId) where.warehouseId = input.warehouseId;
  if (input.userId) where.userId = input.userId;

  if (input.from || input.to) {
    where.createdAt = {};
    if (input.from) {
      const from = new Date(input.from);
      if (!Number.isNaN(from.getTime())) where.createdAt.gte = from;
    }
    if (input.to) {
      const to = new Date(input.to);
      if (!Number.isNaN(to.getTime())) {
        // inclusive end-of-day if date-only
        if (/^\d{4}-\d{2}-\d{2}$/.test(input.to)) {
          to.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = to;
      }
    }
  }

  if (q) {
    where.OR = [
      { reason: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { referenceNo: { contains: q, mode: "insensitive" } },
      { product: { name: { contains: q, mode: "insensitive" } } },
      { product: { sku: { contains: q, mode: "insensitive" } } },
      { user: { fullName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    db.inventoryTransaction.count({ where }),
    db.inventoryTransaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        quantity: true,
        previousQty: true,
        newQty: true,
        reason: true,
        notes: true,
        referenceNo: true,
        referenceType: true,
        createdAt: true,
        userId: true,
        product: {
          select: { id: true, name: true, sku: true, active: true },
        },
        warehouse: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items: MovementHistoryRow[] = rows.map((m) => {
    const dt = splitDateTime(m.createdAt);
    return {
      id: m.id,
      type: m.type,
      quantity: num(m.quantity),
      previousQty: m.previousQty == null ? null : num(m.previousQty),
      newQty: m.newQty == null ? null : num(m.newQty),
      reason: m.reason,
      notes: m.notes,
      referenceNo: m.referenceNo,
      referenceType: m.referenceType,
      createdAt: dt.createdAt,
      date: dt.date,
      time: dt.time,
      product: m.product,
      warehouse: m.warehouse,
      userName: m.user?.fullName ?? null,
      userId: m.userId,
    };
  });

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function loadMovementHistoryFilters(companyId: string) {
  const [warehouses, users, products] = await Promise.all([
    db.warehouse.findMany({
      where: { companyId },
      select: { id: true, name: true, code: true },
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
    }),
    db.user.findMany({
      where: { companyId },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
      take: 200,
    }),
    db.product.findMany({
      where: { companyId },
      select: { id: true, name: true, sku: true, active: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);

  return { warehouses, users, products };
}
