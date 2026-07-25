import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { notifySafe } from "@/lib/notifications/create";
import { auditSafe } from "@/lib/audit/log";

const companyUpdateSchema = z.object({
  name: z.string().min(2, "ناوی کۆمپانیا پێویستە."),
  email: z.string().email("ئیمەیڵ دروست نییە."),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  invoiceHeader: z.string().optional().nullable(),
  invoiceFooter: z.string().optional().nullable(),
  signature: z.string().optional().nullable(),
  stamp: z.string().optional().nullable(),
  themeColor: z.string().optional(),
  accentColor: z.string().optional(),
  fontFamily: z.string().optional(),
  currency: z.string().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const settings = await db.settings.findUnique({
      where: { companyId: user.companyId },
    });

    return NextResponse.json({
      success: true,
      data: {
        company: user.company,
        settings: settings ?? {
          currency: "IQD",
          language: "ku",
          themeColor: "#FFAE42",
          accentColor: "#FFF8EF",
          fontFamily: "Rudaw",
        },
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = companyUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "زانیاری نادروستە.",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    const before = await db.company.findUnique({
      where: { id: user.companyId },
      include: { settings: true },
    });

    const emailTaken = await db.company.findFirst({
      where: {
        email: data.email,
        NOT: { id: user.companyId },
      },
    });

    if (emailTaken) {
      return NextResponse.json(
        { success: false, message: "ئەم ئیمەیڵە پێشتر بەکارهاتووە." },
        { status: 400 }
      );
    }

    const [company] = await db.$transaction([
      db.company.update({
        where: { id: user.companyId },
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          address: data.address || null,
          website: data.website || null,
          logo: data.logo === undefined ? undefined : data.logo || null,
          taxNumber: data.taxNumber || null,
          invoiceHeader: data.invoiceHeader || null,
          invoiceFooter: data.invoiceFooter || null,
          signature:
            data.signature === undefined ? undefined : data.signature || null,
          stamp: data.stamp === undefined ? undefined : data.stamp || null,
        },
      }),
      db.settings.upsert({
        where: { companyId: user.companyId },
        create: {
          companyId: user.companyId,
          themeColor: data.themeColor || "#FFAE42",
          accentColor: data.accentColor || "#FFF8EF",
          fontFamily: data.fontFamily || "Rudaw",
          currency: data.currency || "IQD",
        },
        update: {
          themeColor: data.themeColor,
          accentColor: data.accentColor,
          fontFamily: data.fontFamily,
          currency: data.currency,
        },
      }),
    ]);

    await notifySafe({
      companyId: user.companyId,
      userId: user.id,
      title: "پڕۆفایلی کۆمپانیا نوێکرایەوە",
      message: `زانیاری کۆمپانیای ${company.name} پاشەکەوتکرا.`,
      category: "SYSTEM",
      priority: "NORMAL",
      href: "/dashboard/settings",
      entityType: "Company",
      entityId: company.id,
    });

    await auditSafe({
      companyId: user.companyId,
      userId: user.id,
      module: "SETTINGS",
      action: "UPDATE",
      entityType: "Company",
      entityId: company.id,
      summary: `ڕێکخستنی کۆمپانیا نوێکرایەوە: ${company.name}`,
      oldValue: before
        ? {
            name: before.name,
            email: before.email,
            phone: before.phone,
            themeColor: before.settings?.themeColor,
            currency: before.settings?.currency,
          }
        : null,
      newValue: {
        name: company.name,
        email: company.email,
        phone: company.phone,
        themeColor: data.themeColor,
        currency: data.currency,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      data: company,
      message: "پڕۆفایلی کۆمپانیا نوێکرایەوە.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
