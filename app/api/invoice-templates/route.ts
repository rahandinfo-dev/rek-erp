import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentCompanyId } from "@/lib/auth/current-user";
import { invoiceTemplateSchema } from "@/lib/validators/invoice-template";
import { DEFAULT_INVOICE_CONFIG } from "@/lib/invoices/template-config";

export async function GET() {
  try {
    const companyId = await getCurrentCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const templates = await db.invoiceTemplate.findMany({
      where: { companyId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error("GET TEMPLATES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCurrentCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = invoiceTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    const exists = await db.invoiceTemplate.findFirst({
      where: { companyId, name: data.name },
    });

    if (exists) {
      return NextResponse.json(
        { success: false, message: "ئەم ناوی قاڵبە پێشتر هەیە." },
        { status: 400 }
      );
    }

    const template = await db.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.invoiceTemplate.updateMany({
          where: { companyId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const count = await tx.invoiceTemplate.count({ where: { companyId } });

      return tx.invoiceTemplate.create({
        data: {
          companyId,
          name: data.name,
          size: data.size,
          docType: data.docType,
          isDefault: data.isDefault || count === 0,
          config: data.config ?? DEFAULT_INVOICE_CONFIG,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: template,
      message: "قاڵب پاشەکەوت کرا.",
    });
  } catch (error) {
    console.error("CREATE TEMPLATE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
