import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSaleSchema } from "@/lib/validators/sale";
import { formatMoney, roundMoney } from "@/lib/utils/format";
import { notifySafe } from "@/lib/notifications/create";
import { notifyStockLevels } from "@/lib/notifications/stock";
import { createInvoiceFromSale } from "@/lib/invoices/create-from-sale";
import { applyStockMovement } from "@/lib/inventory/movements";
import { ensureWalkInCustomer } from "@/lib/parties/walk-in";
import { auditSafe } from "@/lib/audit/log";
import { invalidateAfterSale } from "@/lib/cache/invalidate";
import {
  createErpTrace,
  publicErpError,
} from "@/lib/observability/erp-operation";
import { generateSaleNumberInTransaction } from "@/lib/numbering/engine";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 },
      );
    }

    const sales = await db.sale.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        invoiceNo: true,
        total: true,
        createdAt: true,
        customer: { select: { id: true, name: true, code: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        invoice: { select: { id: true, invoiceNo: true, status: true } },
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

    return NextResponse.json({ success: true, data: sales });
  } catch (error) {
    console.error("GET SALES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const trace = createErpTrace(
    "SALE",
    req.headers.get("x-correlation-id") || undefined,
  );
  let activeStep = "SALE_PRE_01_REQUEST_START";
  let stepStarted = trace.start(activeStep);
  try {
    trace.ok(activeStep, stepStarted);
    activeStep = "SALE_PRE_02_USER_RESOLUTION_START";
    stepStarted = trace.start(activeStep);
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 },
      );
    }

    const companyId = user.companyId;
    trace.ok("SALE_PRE_03_USER_RESOLUTION_OK", stepStarted);
    activeStep = "SALE_PRE_04_BODY_PARSE_START";
    stepStarted = trace.start(activeStep);
    const body = await req.json();
    trace.ok("SALE_PRE_05_BODY_PARSE_OK", stepStarted);
    activeStep = "SALE_PRE_06_VALIDATION_START";
    stepStarted = trace.start(activeStep);
    const validation = createSaleSchema.safeParse(body);

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
    trace.ok("SALE_PRE_07_VALIDATION_OK", stepStarted);
    trace.ok("SALE_PRE_08_PAYLOAD_NORMALIZED", stepStarted);
    activeStep = "SALE_PRE_09_COMPANY_VALIDATION_START";
    stepStarted = trace.start(activeStep);

    trace.ok(activeStep, stepStarted);
    activeStep = "SALE_PRE_11_CUSTOMER_VALIDATION_START";
    stepStarted = trace.start(activeStep);

    const resolvedCustomerId =
      data.customerId || (await ensureWalkInCustomer(companyId)).id;

    const [customer, warehouse, company, template, warehouseBalances] =
      await Promise.all([
        db.customer.findFirst({
          where: { id: resolvedCustomerId, companyId, active: true },
        }),
        db.warehouse.findFirst({
          where: { id: data.warehouseId, companyId },
        }),
        db.company.findUnique({
          where: { id: companyId },
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
            website: true,
            logo: true,
            taxNumber: true,
            invoiceHeader: true,
            invoiceFooter: true,
            signature: true,
            stamp: true,
          },
        }),
        db.invoiceTemplate.findFirst({
          where: {
            companyId,
            docType: "SALE",
          },
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
          select: { id: true },
        }),
        db.warehouseStock.findMany({
          where: {
            companyId,
            warehouseId: data.warehouseId,
            productId: { in: data.items.map((i) => i.productId) },
          },
          select: { productId: true, quantity: true, reserved: true },
        }),
      ]);

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "کڕیار نەدۆزرایەوە." },
        { status: 400 },
      );
    }

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: "کۆگا نەدۆزرایەوە." },
        { status: 400 },
      );
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: "کۆمپانیا نەدۆزرایەوە." },
        { status: 400 },
      );
    }

    trace.ok(activeStep, stepStarted);
    activeStep = "SALE_PRE_15_ITEMS_VALIDATION_START";
    stepStarted = trace.start(activeStep);

    const productIds = data.items.map((item) => item.productId);
    const products = await db.product.findMany({
      where: {
        companyId,
        id: { in: productIds },
        active: true,
      },
    });

    if (products.length !== new Set(productIds).size) {
      return NextResponse.json(
        { success: false, message: "هەندێک بەرهەم نادروستن یان ناچالاکن." },
        { status: 400 },
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const balanceMap = new Map(
      warehouseBalances.map((b) => [
        b.productId,
        Number(b.quantity) - Number(b.reserved),
      ]),
    );

    for (const item of data.items) {
      const product = productMap.get(item.productId)!;
      const available = balanceMap.has(item.productId)
        ? balanceMap.get(item.productId)!
        : Number(product.currentStock) - Number(product.reservedStock);

      if (item.quantity > available) {
        return NextResponse.json(
          {
            success: false,
            message: `کۆگای «${product.name}» لە «${warehouse.name}» بەس نییە (بەردەست: ${available}).`,
          },
          { status: 400 },
        );
      }
    }

    const subtotal = roundMoney(
      data.items.reduce(
        (sum, item) => sum + roundMoney(item.quantity * item.unitPrice),
        0,
      ),
    );
    const total = roundMoney(subtotal - data.discount + data.tax);

    trace.ok(activeStep, stepStarted);
    activeStep = "SALE_PRE_21_NUMBERING_START";
    stepStarted = trace.start(activeStep);
    trace.ok(activeStep, stepStarted);
    activeStep = "SALE_TX_01_START";
    stepStarted = trace.start(activeStep);
    const { sale, invoice } = await db.$transaction(async (tx) => {
      trace.ok(activeStep, stepStarted);
      activeStep = "SALE_TX_01_NUMBERING_START";
      stepStarted = trace.start(activeStep);
      const { value: invoiceNo } = await generateSaleNumberInTransaction(
        tx,
        companyId,
        warehouse.code,
      );
      trace.ok(activeStep, stepStarted);
      activeStep = "SALE_TX_02_HEADER_CREATE_START";
      stepStarted = trace.start(activeStep);
      const created = await tx.sale.create({
        data: {
          invoiceNo,
          customerId: resolvedCustomerId,
          warehouseId: data.warehouseId,
          companyId,
          saleDate: data.saleDate,
          status: "COMPLETED",
          subtotal,
          discount: data.discount,
          tax: data.tax,
          total,
          paymentMethod: data.paymentMethod,
          notes: data.notes || null,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: roundMoney(item.quantity * item.unitPrice),
              currency: item.currency || "IQD",
            })),
          },
        },
        include: {
          customer: true,
          warehouse: true,
          items: { include: { product: { include: { unit: true } } } },
        },
      });

      trace.ok(activeStep, stepStarted);
      activeStep = "SALE_TX_04_LINES_CREATE_START";
      stepStarted = trace.start(activeStep);
      trace.ok(activeStep, stepStarted);
      activeStep = "SALE_TX_06_STOCK_MOVEMENTS_START";
      stepStarted = trace.start(activeStep);

      for (const item of data.items) {
        try {
          await applyStockMovement(tx, {
            companyId,
            productId: item.productId,
            warehouseId: data.warehouseId,
            quantity: item.quantity,
            type: "SALE",
            direction: -1,
            userId: user.id,
            reason: "فرۆشتن",
            notes: `فرۆشتن ${invoiceNo}`,
            referenceId: created.id,
            referenceType: "SALE",
            referenceNo: invoiceNo,
            unitCost: item.unitPrice,
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "INSUFFICIENT_STOCK"
          ) {
            throw new Error(`INSUFFICIENT:${item.productId}`);
          }
          throw error;
        }
      }

      trace.ok(activeStep, stepStarted);
      activeStep = "SALE_TX_08_ACCOUNTING_START";
      stepStarted = trace.start(activeStep);
      trace.ok(activeStep, stepStarted);
      activeStep = "SALE_TX_10_PAYMENT_START";
      stepStarted = trace.start(activeStep);
      trace.ok(activeStep, stepStarted);

      const createdInvoice = await createInvoiceFromSale(
        tx,
        created,
        company,
        { id: user.id, fullName: user.fullName },
        template?.id,
      );

      return { sale: created, invoice: createdInvoice };
    });

    trace.ok(activeStep, stepStarted);
    activeStep = "SALE_POST_01_NOTIFICATION_START";
    stepStarted = trace.start(activeStep);

    await notifySafe({
      companyId,
      userId: user.id,
      title: "فرۆشتن تەواوکرا",
      message: `پسوولەی ${sale.invoiceNo} تۆمارکرا.`,
      category: "SALE",
      priority: "NORMAL",
      href: `/dashboard/invoices/${invoice.id}`,
      entityType: "Sale",
      entityId: sale.id,
    });

    await notifySafe({
      companyId,
      userId: user.id,
      title: "پسوولە دروستکرا",
      message: `پسوولەی ${invoice.invoiceNo} بۆ هەمیشە پاشەکەوتکرا.`,
      category: "INVOICE",
      priority: "NORMAL",
      href: `/dashboard/invoices/${invoice.id}`,
      entityType: "پسوولە",
      entityId: invoice.id,
    });

    await notifySafe({
      companyId,
      title: "ئینڤێنتۆری نوێکرایەوە",
      message: `کۆگا دوای فرۆشتنی ${sale.invoiceNo} نوێکرایەوە.`,
      category: "INVENTORY",
      priority: "NORMAL",
      href: "/dashboard/inventory",
      entityType: "Sale",
      entityId: sale.id,
    });

    await notifyStockLevels(
      companyId,
      data.items.map((item) => item.productId),
    );

    if (total >= 1_000_000) {
      await notifySafe({
        companyId,
        userId: user.id,
        title: "فرۆشتنی گەورە",
        message: `فرۆشتنی ${sale.invoiceNo} بە بڕی ${formatMoney(total)} تۆمارکرا.`,
        category: "SALE",
        priority: "HIGH",
        href: `/dashboard/sales/${sale.id}`,
        entityType: "Sale",
        entityId: sale.id,
        metadata: { kind: "LARGE_SALE", total },
      });
    }

    await auditSafe({
      companyId,
      userId: user.id,
      module: "SALE",
      action: "CREATE",
      entityType: "Sale",
      entityId: sale.id,
      summary: `فرۆشتنی ${sale.invoiceNo} دروستکرا`,
      newValue: { invoiceNo: sale.invoiceNo, total },
      req,
    });

    invalidateAfterSale(companyId);

    trace.ok(activeStep, stepStarted);
    trace.committed("SALE_RESPONSE_SUCCESS");

    return NextResponse.json(
      {
        success: true,
        data: { ...sale, invoice },
        message: "فرۆشتن و پسوولە بە سەرکەوتوویی تۆمارکران.",
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
