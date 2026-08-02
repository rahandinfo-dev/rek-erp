import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { canonicalLineTotal, decimalAdd, decimalCompare, decimalSubtract } from "@/lib/invoices/decimal";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/current-user";
import { createPurchaseSchema } from "@/lib/validators/purchase";
import { formatMoney } from "@/lib/utils/format";
import { notifySafe } from "@/lib/notifications/create";
import { notifyStockLevels } from "@/lib/notifications/stock";
import { applyStockMovement } from "@/lib/inventory/movements";
import { ensureWalkInSupplier } from "@/lib/parties/walk-in";
import { auditSafe } from "@/lib/audit/log";
import { invalidateAfterPurchase } from "@/lib/cache/invalidate";
import {
  createErpTrace,
  publicErpError,
} from "@/lib/observability/erp-operation";
import { generatePurchaseNumberInTransaction } from "@/lib/numbering/engine";

export async function GET() {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 },
      );
    }

    const purchases = await db.purchase.findMany({
      where: { companyId },
      select: {
        id: true,
        invoiceNo: true,
        total: true,
        createdAt: true,
        supplier: { select: { id: true, name: true, code: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    });

    return NextResponse.json({ success: true, data: purchases });
  } catch (error) {
    console.error("GET PURCHASES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const trace = createErpTrace(
    "PURCHASE",
    req.headers.get("x-correlation-id") || undefined,
  );
  let activeStep = "PURCHASE_PRE_01_REQUEST_START";
  let stepStarted = trace.start(activeStep);
  try {
    trace.ok(activeStep, stepStarted);
    activeStep = "PURCHASE_PRE_02_USER_RESOLUTION_START";
    stepStarted = trace.start(activeStep);
    const user = await getCurrentUser();
    const companyId = user?.companyId;

    if (!user || !companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 },
      );
    }

    trace.ok("PURCHASE_PRE_03_USER_RESOLUTION_OK", stepStarted);
    activeStep = "PURCHASE_PRE_04_BODY_PARSE_START";
    stepStarted = trace.start(activeStep);
    const body = await req.json();
    trace.ok("PURCHASE_PRE_05_BODY_PARSE_OK", stepStarted);
    activeStep = "PURCHASE_PRE_06_VALIDATION_START";
    stepStarted = trace.start(activeStep);
    const validation = createPurchaseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_PAYLOAD",
          message: validation.error.issues[0]?.message || "زانیارییەکان نادروستن.",
          errors: validation.error.flatten(),
          correlationId: trace.correlationId,
        },
        { status: 400 },
      );
    }

    const data = validation.data;
    trace.ok("PURCHASE_PRE_07_VALIDATION_OK", stepStarted);
    trace.ok("PURCHASE_PRE_08_PAYLOAD_NORMALIZED", stepStarted);
    activeStep = "PURCHASE_PRE_09_COMPANY_VALIDATION_START";
    stepStarted = trace.start(activeStep);

    trace.ok(activeStep, stepStarted);
    activeStep = "PURCHASE_PRE_11_SUPPLIER_VALIDATION_START";
    stepStarted = trace.start(activeStep);

    const resolvedSupplierId =
      data.supplierId || (await ensureWalkInSupplier(companyId)).id;

    const [supplier, warehouse] = await Promise.all([
      db.supplier.findFirst({
        where: { id: resolvedSupplierId, companyId, active: true },
      }),
      db.warehouse.findFirst({
        where: { id: data.warehouseId, companyId },
      }),
    ]);

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "دابینکەر نەدۆزرایەوە." },
        { status: 400 },
      );
    }

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: "کۆگا نەدۆزرایەوە." },
        { status: 400 },
      );
    }

    trace.ok(activeStep, stepStarted);
    activeStep = "PURCHASE_PRE_15_ITEMS_VALIDATION_START";
    stepStarted = trace.start(activeStep);

    const productIds = data.items.map((item) => item.productId);
    const products = await db.product.findMany({
      where: {
        companyId,
        id: { in: productIds },
        active: true,
      },
      include: { unit: true },
    });

    if (products.length !== new Set(productIds).size) {
      return NextResponse.json(
        { success: false, message: "هەندێک بەرهەم نادروستن یان ناچالاکن." },
        { status: 400 },
      );
    }

    const lineTotals = data.items.map((item) =>
      canonicalLineTotal(item.quantity, item.unitPrice, item.discount),
    );
    const subtotal = lineTotals.reduce(decimalAdd, "0");
    const total = decimalAdd(decimalSubtract(subtotal, data.discount), data.tax);
    const remainingBalance = decimalSubtract(total, data.paidAmount);

    trace.ok(activeStep, stepStarted);
    activeStep = "PURCHASE_PRE_19_NUMBERING_START";
    stepStarted = trace.start(activeStep);
    trace.ok(activeStep, stepStarted);
    activeStep = "PURCHASE_TX_01_START";
    stepStarted = trace.start(activeStep);
    const purchase = await db.$transaction(async (tx) => {
      trace.ok(activeStep, stepStarted);
      activeStep = "PURCHASE_TX_01_NUMBERING_START";
      stepStarted = trace.start(activeStep);
      const { value: invoiceNo } = await generatePurchaseNumberInTransaction(
        tx,
        companyId,
        warehouse.code,
      );
      trace.ok(activeStep, stepStarted);
      activeStep = "PURCHASE_TX_02_HEADER_CREATE_START";
      stepStarted = trace.start(activeStep);
      const created = await tx.purchase.create({
        data: {
          invoiceNo,
          supplierId: resolvedSupplierId,
          warehouseId: data.warehouseId,
          companyId,
          purchaseDate: data.purchaseDate,
          status: "COMPLETED",
          subtotal,
          discount: data.discount,
          tax: data.tax,
          total,
          paidAmount: data.paidAmount,
          remainingBalance,
          notes: data.notes || null,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              total: canonicalLineTotal(item.quantity, item.unitPrice, item.discount),
              currency: item.currency || "IQD",
              productNameSnapshot: products.find((product) => product.id === item.productId)?.name,
              productSkuSnapshot: products.find((product) => product.id === item.productId)?.sku,
              unitSnapshot: products.find((product) => product.id === item.productId)?.unit.symbol || products.find((product) => product.id === item.productId)?.unit.name,
            })),
          },
        },
        include: {
          supplier: true,
          warehouse: true,
          items: { include: { product: true } },
        },
      });

      trace.ok(activeStep, stepStarted);
      activeStep = "PURCHASE_TX_04_LINES_CREATE_START";
      stepStarted = trace.start(activeStep);
      trace.ok(activeStep, stepStarted);
      activeStep = "PURCHASE_TX_06_STOCK_MOVEMENTS_START";
      stepStarted = trace.start(activeStep);

      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            purchasePrice: item.unitPrice,
            costPrice: item.unitPrice,
          },
        });

        await applyStockMovement(tx, {
          companyId,
          productId: item.productId,
          warehouseId: data.warehouseId,
          quantity: item.quantity,
          type: "PURCHASE",
          direction: 1,
          userId: user.id,
          reason: "کڕین",
          notes: `کڕین ${invoiceNo}`,
          referenceId: created.id,
          referenceType: "PURCHASE",
          referenceNo: invoiceNo,
          unitCost: item.unitPrice,
        });
      }

      trace.ok(activeStep, stepStarted);
      activeStep = "PURCHASE_TX_08_ACCOUNTING_START";
      stepStarted = trace.start(activeStep);
      trace.ok(activeStep, stepStarted);
      activeStep = "PURCHASE_TX_10_PAYMENT_START";
      stepStarted = trace.start(activeStep);
      trace.ok(activeStep, stepStarted);

      return created;
    });

    trace.ok(activeStep, stepStarted);
    activeStep = "PURCHASE_POST_01_NOTIFICATION_START";
    stepStarted = trace.start(activeStep);

    await notifySafe({
      companyId,
      title: "کڕین تەواوکرا",
      message: `پسوولەی ${purchase.invoiceNo} تۆمارکرا.`,
      category: "PURCHASE",
      priority: "NORMAL",
      href: `/dashboard/purchases/${purchase.id}`,
      entityType: "Purchase",
      entityId: purchase.id,
    });

    await notifySafe({
      companyId,
      title: "ئینڤێنتۆری نوێکرایەوە",
      message: `کۆگا دوای کڕینی ${purchase.invoiceNo} نوێکرایەوە.`,
      category: "INVENTORY",
      priority: "NORMAL",
      href: "/dashboard/inventory",
      entityType: "Purchase",
      entityId: purchase.id,
    });

    if (decimalCompare(total, 1_000_000) >= 0) {
      await notifySafe({
        companyId,
        userId: user.id,
        title: "کڕینی گەورە",
        message: `کڕینی ${purchase.invoiceNo} بە بڕی ${formatMoney(total)} تۆمارکرا.`,
        category: "PURCHASE",
        priority: "HIGH",
        href: `/dashboard/purchases/${purchase.id}`,
        entityType: "Purchase",
        entityId: purchase.id,
        metadata: { kind: "LARGE_PURCHASE", total },
      });
    }

    await notifyStockLevels(
      companyId,
      data.items.map((item) => item.productId),
    );

    await auditSafe({
      companyId,
      userId: user.id,
      module: "PURCHASE",
      action: "CREATE",
      entityType: "Purchase",
      entityId: purchase.id,
      summary: `کڕینی ${purchase.invoiceNo} دروستکرا`,
      newValue: { invoiceNo: purchase.invoiceNo, total },
      req,
    });

    invalidateAfterPurchase(companyId);

    trace.ok(activeStep, stepStarted);
    trace.committed("PURCHASE_RESPONSE_SUCCESS");

    return NextResponse.json(
      {
        success: true,
        data: purchase,
        message: "کڕین بە سەرکەوتوویی تۆمارکرا.",
        correlationId: trace.correlationId,
      },
      { headers: { "x-correlation-id": trace.correlationId } },
    );
  } catch (error) {
    trace.failed(activeStep, stepStarted, error);
    const response = publicErpError(error);
    return NextResponse.json(
      {
        success: false,
        code: response.code,
        message: response.message,
        correlationId: trace.correlationId,
      },
      {
        status: response.status,
        headers: { "x-correlation-id": trace.correlationId },
      },
    );
  }
}
