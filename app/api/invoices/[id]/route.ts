import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { mapInvoiceToPreview } from "@/lib/invoices/map-preview";
import {
  DEFAULT_INVOICE_CONFIG,
  type InvoiceTemplateConfig,
} from "@/lib/invoices/template-config";
import { applyStockMovement } from "@/lib/inventory/movements";
import { notifySafe } from "@/lib/notifications/create";
import { notifyStockLevels } from "@/lib/notifications/stock";
import { auditSafe } from "@/lib/audit/log";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const invoice = await db.invoice.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        printHistory: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        pdfHistory: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        template: true,
        sale: { select: { id: true, status: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "پسوولە نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    const config: InvoiceTemplateConfig = {
      ...DEFAULT_INVOICE_CONFIG,
      ...((invoice.template?.config as Partial<InvoiceTemplateConfig>) || {}),
      labels: {
        ...DEFAULT_INVOICE_CONFIG.labels,
        ...(((invoice.template?.config as Partial<InvoiceTemplateConfig>) || {}).labels || {}),
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        invoice,
        preview: mapInvoiceToPreview(invoice),
        company: {
          name: invoice.companyName,
          email: invoice.companyEmail,
          phone: invoice.companyPhone,
          address: invoice.companyAddress,
          website: invoice.companyWebsite,
          logo: invoice.companyLogo,
        },
        config,
        size: invoice.template?.size || "A4",
        templateName: invoice.template?.name || "قاڵبی بنەڕەتی",
      },
    });
  } catch (error) {
    console.error("GET INVOICE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

/** Void invoice + cancel linked sale (restores stock if sale was completed). */
export async function DELETE(_req: NextRequest, { params }: Props) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const companyId = user.companyId;
    const userId = user.id;

    const invoice = await db.invoice.findFirst({
      where: { id, companyId },
      include: {
        sale: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "پسوولە نەدۆزرایەوە." },
        { status: 404 }
      );
    }

    if (invoice.status === "VOID") {
      return NextResponse.json(
        { success: false, message: "ئەم پسوولەیە پێشتر هەڵوەشێنراوەتەوە." },
        { status: 400 }
      );
    }

    const sale = invoice.sale;

    await db.$transaction(async (tx) => {
      if (sale.status === "COMPLETED") {
        for (const item of sale.items) {
          await applyStockMovement(tx, {
            companyId,
            productId: item.productId,
            warehouseId: sale.warehouseId,
            quantity: Number(item.quantity),
            type: "SALE_RETURN",
            direction: 1,
            userId,
            reason: "هەڵوەشاندنەوەی پسوولە",
            notes: `هەڵوەشاندنەوەی پسوولەی ${invoice.invoiceNo}`,
            referenceId: sale.id,
            referenceType: "SALE",
            referenceNo: sale.invoiceNo,
            unitCost: Number(item.unitPrice),
          });
        }
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: "CANCELLED" },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "VOID" },
      });
    });

    await notifySafe({
      companyId,
      userId,
      title: "پسوولە هەڵوەشێنرایەوە",
      message: `پسوولەی ${invoice.invoiceNo} هەڵوەشێنرایەوە.`,
      category: "SALE",
      priority: "HIGH",
      href: `/dashboard/invoices/${invoice.id}`,
      entityType: "پسوولە",
      entityId: invoice.id,
    });

    if (sale.status === "COMPLETED") {
      await notifyStockLevels(
        companyId,
        sale.items.map((item) => item.productId)
      );
    }

    await auditSafe({
      companyId,
      userId,
      module: "INVOICE",
      action: "DELETE",
      entityType: "پسوولە",
      entityId: invoice.id,
      summary: `پسوولە soft delete: ${invoice.invoiceNo}`,
      oldValue: { status: invoice.status, invoiceNo: invoice.invoiceNo },
      newValue: { status: "VOID" },
      req: _req,
    });

    return NextResponse.json({
      success: true,
      message: "پسوولە هەڵوەشێنرایەوە.",
    });
  } catch (error) {
    console.error("DELETE INVOICE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
