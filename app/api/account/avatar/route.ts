import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { deleteUpload } from "@/lib/storage/upload";
import { uploadMessages } from "@/lib/uploads/messages";

const schema = z.object({
  avatar: z.string().nullable().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: uploadMessages.errors.unauthorized },
        { status: 401 }
      );
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "داتای نادروست." },
        { status: 400 }
      );
    }

    const nextAvatar =
      parsed.data.avatar === undefined
        ? undefined
        : parsed.data.avatar?.trim() || null;

    if (nextAvatar === undefined) {
      return NextResponse.json({
        success: true,
        data: { avatar: user.avatar ?? null },
      });
    }

    const before = await db.user.findUnique({
      where: { id: user.id },
      select: { avatar: true },
    });

    const updated = await db.user.update({
      where: { id: user.id },
      data: { avatar: nextAvatar },
      select: { avatar: true },
    });

    if (before?.avatar && before.avatar !== nextAvatar) {
      void deleteUpload(before.avatar, user.companyId).catch(() => undefined);
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: nextAvatar
        ? uploadMessages.success
        : uploadMessages.deleted,
    });
  } catch (error) {
    console.error("AVATAR UPDATE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "هەڵەیەک ڕوویدا." },
      { status: 500 }
    );
  }
}
