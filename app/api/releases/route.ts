import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isCompanyAdministrator } from "@/lib/auth/authorization";
import { canSeeRelease, SEMVER_PATTERN } from "@/lib/releases/policy";

const releaseSchema = z.object({
  version: z.string().regex(SEMVER_PATTERN), title: z.string().min(2),
  releaseDate: z.coerce.date(), summary: z.string().min(2), changes: z.string().optional().nullable(),
  publishedAt: z.coerce.date().optional().nullable(), isCurrent: z.boolean().default(false), isActive: z.boolean().default(true),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const admin = await isCompanyAdministrator(user.companyId, user.id);
  const rows = await db.appRelease.findMany({ where: { companyId: user.companyId }, include: { reads: { where: { userId: user.id }, select: { readAt: true } } }, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }] });
  const data = rows.filter((row) => canSeeRelease(row, user.createdAt, admin)).map(({ reads, ...row }) => ({ ...row, isRead: reads.length > 0, isNew: Boolean(row.publishedAt && row.publishedAt > user.createdAt && reads.length === 0) }));
  return NextResponse.json({ success: true, data, admin });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!(await isCompanyAdministrator(user.companyId, user.id))) return NextResponse.json({ success: false, message: "Administrator permission required" }, { status: 403 });
  const parsed = releaseSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message }, { status: 400 });
  const data = await db.$transaction(async (tx) => {
    if (parsed.data.isCurrent) await tx.appRelease.updateMany({ where: { companyId: user.companyId, isCurrent: true }, data: { isCurrent: false } });
    return tx.appRelease.create({ data: { ...parsed.data, companyId: user.companyId } });
  });
  return NextResponse.json({ success: true, data }, { status: 201 });
}
