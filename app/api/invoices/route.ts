import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { Prisma } from "@/lib/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") || 20))
    );
    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status") || "";

    const where: Prisma.InvoiceWhereInput = {
      companyId: user.companyId,
      deletedAt: null,
    };

    if (status === "ACTIVE" || status === "VOID") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { invoiceNo: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { warehouseName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      db.invoice.count({ where }),
      db.invoice.findMany({
        where,
        orderBy: [{ invoiceDate: "desc" }, { invoiceTime: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          invoiceNo: true,
          customerName: true,
          warehouseName: true,
          grandTotal: true,
          paymentMethod: true,
          status: true,
          invoiceDate: true,
          invoiceTime: true,
          createdByName: true,
          createdAt: true,
          _count: {
            select: {
              printHistory: true,
              pdfHistory: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      },
    });
  } catch (error) {
    console.error("GET INVOICES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
