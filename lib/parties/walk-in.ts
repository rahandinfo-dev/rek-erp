import { db } from "@/lib/prisma/db";

const WALK_IN_NAME = "کڕیاری گشتی";
const WALK_IN_SUPPLIER_NAME = "دابینکەری گشتی";

/** Guaranteed walk-in customer so sales can omit a specific customer. */
export async function ensureWalkInCustomer(companyId: string) {
  const code = `WALKIN-C-${companyId.slice(0, 8)}`;
  const existing = await db.customer.findFirst({
    where: { companyId, OR: [{ code }, { name: WALK_IN_NAME }] },
  });
  if (existing) {
    if (!existing.active) {
      return db.customer.update({
        where: { id: existing.id },
        data: { active: true },
      });
    }
    return existing;
  }
  try {
    return await db.customer.create({
      data: {
        companyId,
        name: WALK_IN_NAME,
        code,
        notes: "Walk-in / optional customer for POS sales",
        active: true,
      },
    });
  } catch {
    return db.customer.findFirstOrThrow({
      where: { companyId, code },
    });
  }
}

/** Guaranteed walk-in supplier so purchases can omit a specific supplier. */
export async function ensureWalkInSupplier(companyId: string) {
  const code = `WALKIN-S-${companyId.slice(0, 8)}`;
  const existing = await db.supplier.findFirst({
    where: { companyId, OR: [{ code }, { name: WALK_IN_SUPPLIER_NAME }] },
  });
  if (existing) {
    if (!existing.active) {
      return db.supplier.update({
        where: { id: existing.id },
        data: { active: true },
      });
    }
    return existing;
  }
  try {
    return await db.supplier.create({
      data: {
        companyId,
        name: WALK_IN_SUPPLIER_NAME,
        code,
        notes: "Walk-in / optional supplier",
        active: true,
      },
    });
  } catch {
    return db.supplier.findFirstOrThrow({
      where: { companyId, code },
    });
  }
}
