import { db } from "@/lib/prisma/db";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  DEFAULT_RULES,
  NUMBERING_MODULES,
  type GenerateContext,
  type NumberingModule,
  type NumberingRuleView,
  type ResetPolicy,
} from "@/lib/numbering/types";
import { periodKeyFor, renderFormat } from "@/lib/numbering/format";

type Tx = Prisma.TransactionClient;

function ruleFromDb(row: {
  moduleKey: string;
  enabled: boolean;
  format: string;
  prefix: string;
  suffix: string;
  moduleCode: string;
  padLength: number;
  startFrom: number;
  resetPolicy: string;
  fiscalYearStartMonth: number;
  allowManualOverride: boolean;
}): NumberingRuleView {
  return {
    moduleKey: row.moduleKey,
    enabled: row.enabled,
    format: row.format,
    prefix: row.prefix,
    suffix: row.suffix,
    moduleCode: row.moduleCode,
    padLength: row.padLength,
    startFrom: row.startFrom,
    resetPolicy: (row.resetPolicy as ResetPolicy) || "yearly",
    fiscalYearStartMonth: row.fiscalYearStartMonth,
    allowManualOverride: row.allowManualOverride,
  };
}

export async function ensureDefaultRules(companyId: string): Promise<void> {
  const existing = await db.numberingRule.findMany({
    where: { companyId },
    select: { moduleKey: true },
  });
  const have = new Set(existing.map((e) => e.moduleKey));
  const missing = NUMBERING_MODULES.filter((m) => !have.has(m));
  if (missing.length === 0) return;

  await db.numberingRule.createMany({
    data: missing.map((m) => {
      const d = DEFAULT_RULES[m];
      return {
        companyId,
        moduleKey: d.moduleKey,
        enabled: d.enabled,
        format: d.format,
        prefix: d.prefix,
        suffix: d.suffix,
        moduleCode: d.moduleCode,
        padLength: d.padLength,
        startFrom: d.startFrom,
        resetPolicy: d.resetPolicy,
        fiscalYearStartMonth: d.fiscalYearStartMonth,
        allowManualOverride: d.allowManualOverride,
      };
    }),
    skipDuplicates: true,
  });
}

export async function getNumberingRule(
  companyId: string,
  moduleKey: string
): Promise<NumberingRuleView> {
  await ensureDefaultRules(companyId);
  const row = await db.numberingRule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  if (row) return ruleFromDb(row);
  const fallback =
    DEFAULT_RULES[moduleKey as NumberingModule] || DEFAULT_RULES.sales;
  return { ...fallback };
}

export async function listNumberingRules(
  companyId: string
): Promise<NumberingRuleView[]> {
  await ensureDefaultRules(companyId);
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { code: true, name: true },
  });
  const companyCode =
    company?.code ||
    company?.name?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() ||
    "CO";

  const rows = await db.numberingRule.findMany({
    where: { companyId },
    orderBy: { moduleKey: "asc" },
  });

  const now = new Date();
  return Promise.all(
    rows.map(async (row) => {
      const rule = ruleFromDb(row);
      const periodKey = periodKeyFor(
        rule.resetPolicy,
        now,
        rule.fiscalYearStartMonth
      );
      const counter = await db.numberingCounter.findUnique({
        where: {
          companyId_moduleKey_periodKey: {
            companyId,
            moduleKey: rule.moduleKey,
            periodKey,
          },
        },
      });
      const next = counter?.nextValue ?? rule.startFrom;
      return {
        ...rule,
        nextValue: next,
        preview: renderFormat(rule, next, { companyCode, now }),
      };
    })
  );
}

async function allocateSequence(
  tx: Tx,
  companyId: string,
  moduleKey: string,
  periodKey: string,
  startFrom: number
): Promise<number> {
  try {
    const created = await tx.numberingCounter.create({
      data: {
        companyId,
        moduleKey,
        periodKey,
        nextValue: startFrom + 1,
      },
    });
    return created.nextValue - 1;
  } catch {
    // Concurrent create — increment existing
    const updated = await tx.numberingCounter.update({
      where: {
        companyId_moduleKey_periodKey: {
          companyId,
          moduleKey,
          periodKey,
        },
      },
      data: { nextValue: { increment: 1 } },
    });
    return updated.nextValue - 1;
  }
}

/**
 * Generate next document number. Collision-safe under concurrency via
 * unique counter rows + increment. Retries if rendered value collides
 * with an uniqueness check callback.
 */
export async function generateDocumentNumber(
  moduleKey: string,
  ctx: GenerateContext,
  isTaken?: (value: string) => Promise<boolean>
): Promise<{ value: string; sequential: number; fromOverride: boolean }> {
  const override = ctx.override?.trim();
  if (override) {
    if (isTaken && (await isTaken(override))) {
      throw new Error("Document number already exists");
    }
    return { value: override, sequential: 0, fromOverride: true };
  }

  const rule = await getNumberingRule(ctx.companyId, moduleKey);
  if (!rule.enabled) {
    // Legacy fallback — timestamp-based, still unique
    const stamp = `${moduleKey.slice(0, 3).toUpperCase()}-${Date.now()}`;
    return { value: stamp.slice(0, 64), sequential: 0, fromOverride: false };
  }

  const company =
    ctx.companyCode ||
    (
      await db.company.findUnique({
        where: { id: ctx.companyId },
        select: { code: true, name: true },
      })
    )?.code ||
    "CO";

  const now = ctx.now || new Date();
  const periodKey = periodKeyFor(
    rule.resetPolicy,
    now,
    rule.fiscalYearStartMonth
  );

  if (ctx.previewOnly) {
    const counter = await db.numberingCounter.findUnique({
      where: {
        companyId_moduleKey_periodKey: {
          companyId: ctx.companyId,
          moduleKey,
          periodKey,
        },
      },
    });
    const seq = counter?.nextValue ?? rule.startFrom;
    return {
      value: renderFormat(rule, seq, {
        companyCode: company,
        warehouseCode: ctx.warehouseCode,
        now,
      }),
      sequential: seq,
      fromOverride: false,
    };
  }

  // Retry loop for rare format collisions
  for (let attempt = 0; attempt < 8; attempt++) {
    const seq = await db.$transaction((tx) =>
      allocateSequence(tx, ctx.companyId, moduleKey, periodKey, rule.startFrom)
    );
    const value = renderFormat(rule, seq, {
      companyCode: company,
      warehouseCode: ctx.warehouseCode,
      now,
    });
    if (isTaken && (await isTaken(value))) {
      continue;
    }
    return { value, sequential: seq, fromOverride: false };
  }

  throw new Error("Unable to allocate a unique document number");
}

/** Convenience: sales/purchases share invoice-style numbers. */
export async function generateSaleNumber(
  companyId: string,
  warehouseCode?: string | null,
  override?: string | null
) {
  return generateDocumentNumber(
    "sales",
    { companyId, warehouseCode, override },
    async (value) => {
      const hit = await db.sale.findFirst({
        where: { invoiceNo: value },
        select: { id: true },
      });
      return Boolean(hit);
    }
  );
}

export async function generatePurchaseNumber(
  companyId: string,
  warehouseCode?: string | null,
  override?: string | null
) {
  return generateDocumentNumber(
    "purchases",
    { companyId, warehouseCode, override },
    async (value) => {
      const hit = await db.purchase.findFirst({
        where: { invoiceNo: value },
        select: { id: true },
      });
      return Boolean(hit);
    }
  );
}

export async function generateProductSku(
  companyId: string,
  override?: string | null
) {
  return generateDocumentNumber(
    "products",
    { companyId, override },
    async (value) => {
      const hit = await db.product.findFirst({
        where: { companyId, sku: value },
        select: { id: true },
      });
      return Boolean(hit);
    }
  );
}

export async function generateProductBarcodeNumber(
  companyId: string,
  override?: string | null
) {
  return generateDocumentNumber(
    "barcodes",
    { companyId, override },
    async (value) => {
      const hit = await db.product.findFirst({
        where: { companyId, barcode: value },
        select: { id: true },
      });
      return Boolean(hit);
    }
  );
}

export async function generatePartyCode(
  moduleKey: "customers" | "suppliers" | "warehouses",
  companyId: string,
  override?: string | null
) {
  return generateDocumentNumber(
    moduleKey,
    { companyId, override },
    async (value) => {
      if (moduleKey === "customers") {
        return Boolean(
          await db.customer.findFirst({
            where: { code: value },
            select: { id: true },
          })
        );
      }
      if (moduleKey === "suppliers") {
        return Boolean(
          await db.supplier.findFirst({
            where: { code: value },
            select: { id: true },
          })
        );
      }
      return Boolean(
        await db.warehouse.findFirst({
          where: { companyId, code: value },
          select: { id: true },
        })
      );
    }
  );
}

export async function generateEmployeeUsername(
  companyId: string,
  override?: string | null
) {
  return generateDocumentNumber(
    "employees",
    { companyId, override },
    async (value) => {
      const hit = await db.employee.findFirst({
        where: { companyId, username: value.toLowerCase() },
        select: { id: true },
      });
      return Boolean(hit);
    }
  );
}

export async function resetCounter(
  companyId: string,
  moduleKey: string,
  toValue?: number
) {
  const rule = await getNumberingRule(companyId, moduleKey);
  const periodKey = periodKeyFor(
    rule.resetPolicy,
    new Date(),
    rule.fiscalYearStartMonth
  );
  const next = toValue ?? rule.startFrom;
  await db.numberingCounter.upsert({
    where: {
      companyId_moduleKey_periodKey: { companyId, moduleKey, periodKey },
    },
    create: { companyId, moduleKey, periodKey, nextValue: next },
    update: { nextValue: next },
  });
  return next;
}
