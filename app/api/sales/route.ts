import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSaleSchema } from "@/lib/validators/sale";
import { roundMoney } from "@/lib/utils/format";
import { notifySafe } from "@/lib/notifications/create";
import { notifyStockLevels } from "@/lib/notifications/stock";
import { createInvoiceFromSale } from "@/lib/invoices/create-from-sale";
import { applyStockMovement } from "@/lib/inventory/movements";
import { ensureWalkInCustomer } from "@/lib/parties/walk-in";
import { auditSafe } from "@/lib/audit/log";
import { invalidateAfterSale } from "@/lib/cache/invalidate";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
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
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const companyId = user.companyId;
    const body = await req.json();
    const validation = createSaleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    const resolvedCustomerId =
      data.customerId ||
      (await ensureWalkInCustomer(companyId)).id;

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
            OR: [{ isDefault: true }, { docType: "SALE" }],
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
        { status: 400 }
      );
    }

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: "کۆگا نەدۆزرایەوە." },
        { status: 400 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: "کۆمپانیا نەدۆزرایەوە." },
        { status: 400 }
      );
    }

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
        { status: 400 }
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const balanceMap = new Map(
      warehouseBalances.map((b) => [
        b.productId,
        Number(b.quantity) - Number(b.reserved),
      ])
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
          { status: 400 }
        );
      }
    }

    const subtotal = roundMoney(
      data.items.reduce((sum, item) => sum + item.total, 0)
    );
    const total = roundMoney(subtotal - data.discount + data.tax);

    const { generateSaleNumber } = await import("@/lib/numbering/engine");
    const allocated = await generateSaleNumber(
      companyId,
      warehouse.code,
      null
    );
    const invoiceNo = allocated.value;

    const { sale, invoice } = await db.$transaction(async (tx) => {
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
              total: item.total,
              currency: item.currency || "IQD",
            })),
          },
        },
        include: {
          customer: true,
          warehouse: true,
          items: { include: { product: true } },
        },
      });

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
          if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
            throw new Error(`INSUFFICIENT:${item.productId}`);
          }
          throw error;
        }
      }

      const createdInvoice = await createInvoiceFromSale(
        tx,
        created,
        company,
        { id: user.id, fullName: user.fullName },
        template?.id
      );

      return { sale: created, invoice: createdInvoice };
    });

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
      data.items.map((item) => item.productId)
    );

    if (total >= 1_000_000) {
      await notifySafe({
        companyId,
        userId: user.id,
        title: "فرۆشتنی گەورە",
        message: `فرۆشتنی ${sale.invoiceNo} بە بڕی ${total.toLocaleString()} IQD تۆمارکرا.`,
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

    return NextResponse.json({
      success: true,
      data: { ...sale, invoice },
      message: "فرۆشتن و پسوولە بە سەرکەوتوویی تۆمارکران.",
    });
  } catch (error) {
    console.error("CREATE SALE ERROR:", error);
    if (error instanceof Error && error.message.startsWith("INSUFFICIENT:")) {
      return NextResponse.json(
        { success: false, message: "کۆگای بەرهەم بەس نییە." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
