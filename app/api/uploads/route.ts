import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { deleteUpload, saveUpload } from "@/lib/storage/upload";
import { isUploadKind } from "@/lib/uploads/kinds";
import { uploadMessages } from "@/lib/uploads/messages";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: uploadMessages.errors.unauthorized },
        { status: 401 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const kindRaw = String(form.get("kind") || "company");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: uploadMessages.errors.required },
        { status: 400 }
      );
    }

    if (!isUploadKind(kindRaw)) {
      return NextResponse.json(
        { success: false, message: uploadMessages.errors.invalidKind },
        { status: 400 }
      );
    }

    const url = await saveUpload(file, kindRaw, user.companyId);

    return NextResponse.json({
      success: true,
      data: { url },
      message: uploadMessages.success,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : uploadMessages.errors.failed,
      },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: uploadMessages.errors.unauthorized },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => null)) as { url?: string } | null;
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!url) {
      return NextResponse.json(
        { success: false, message: uploadMessages.errors.required },
        { status: 400 }
      );
    }

    await deleteUpload(url, user.companyId);

    return NextResponse.json({
      success: true,
      message: uploadMessages.deleted,
    });
  } catch (error) {
    console.error("UPLOAD DELETE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : uploadMessages.errors.deleteFailed,
      },
      { status: 400 }
    );
  }
}
