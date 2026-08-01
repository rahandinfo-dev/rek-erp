import { db } from "@/lib/prisma/db";

/** Until account roles are introduced, the company's first account is its administrator. */
export async function isCompanyAdministrator(companyId: string, userId: string) {
  const owner = await db.user.findFirst({
    where: { companyId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return owner?.id === userId;
}
