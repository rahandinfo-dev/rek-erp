import { NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isCompanyAdministrator } from "@/lib/auth/authorization";
import { canSeeRelease } from "@/lib/releases/policy";
type Params = { params: Promise<{ id: string }> };
export async function POST(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });
  const { id } = await params;
  const release = await db.appRelease.findFirst({ where: { id, companyId: user.companyId } });
  const admin = await isCompanyAdministrator(user.companyId, user.id);
  if (!release || !canSeeRelease(release, user.createdAt, admin)) return NextResponse.json({ success: false }, { status: 404 });
  await db.appReleaseRead.upsert({ where: { releaseId_userId: { releaseId: id, userId: user.id } }, create: { releaseId: id, userId: user.id }, update: { readAt: new Date() } });
  return NextResponse.json({ success: true });
}
