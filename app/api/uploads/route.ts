import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  saveCompanyLogo,
  saveEmployeePhoto,
  saveProductImage,
  saveTemplateAsset,
} from "@/lib/storage/upload";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "تکایە سەرەتا بچۆ ژوورەوە." },
        { status: 401 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") || "company");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "فایل پێویستە." },
        { status: 400 }
      );
    }

    const url =
      kind === "template"
        ? await saveTemplateAsset(file)
        : kind === "product"
          ? await saveProductImage(file)
          : kind === "employee"
            ? await saveEmployeePhoto(file)
            : await saveCompanyLogo(file);

    return NextResponse.json({
      success: true,
      data: { url },
      message: "وێنە بارکرا.",
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "هەڵەیەک ڕوویدا.",
      },
      { status: 400 }
    );
  }
}
