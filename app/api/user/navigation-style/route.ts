import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/prisma/db";
import { NAVIGATION_STYLES } from "@/lib/navigation/styles";

const bodySchema = z.object({ style: z.enum(NAVIGATION_STYLES) });

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "ڕێکخستنەکە دروست نییە." }, { status: 400 });
  await db.user.update({ where: { id: user.id }, data: { navigationStyle: parsed.data.style } });
  return NextResponse.json({ success: true, data: { style: parsed.data.style } });
}
