import { getCurrentUser } from "@/lib/auth/current-user";
import type { InventoryTransactionType } from "@/lib/prisma/client";
import {
  loadMovementHistoryFilters,
  queryMovementHistory,
} from "@/lib/inventory/history";
import MovementHistoryClient from "@/components/inventory/MovementHistoryClient";

const TYPES = new Set([
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

export default async function InventoryMovementHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; productId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { type: typeParam, productId: productParam } = await searchParams;
  const initialType =
    typeParam && TYPES.has(typeParam)
      ? (typeParam as InventoryTransactionType)
      : "";
  const initialProductId = (productParam || "").trim();

  const [filters, initial] = await Promise.all([
    loadMovementHistoryFilters(user.companyId),
    queryMovementHistory({
      companyId: user.companyId,
      type: initialType,
      productId: initialProductId || undefined,
      page: 1,
      pageSize: 25,
    }),
  ]);

  return (
    <MovementHistoryClient
      warehouses={filters.warehouses}
      users={filters.users}
      products={filters.products}
      initialItems={initial.items}
      initialPagination={initial.pagination}
      initialType={initialType}
      initialProductId={initialProductId}
    />
  );
}
