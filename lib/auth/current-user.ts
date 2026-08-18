import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/prisma/db";
import { verifyToken } from "./jwt";

/**
 * Request-level memoization — layout + page + nested RSC share one DB hit.
 */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      companyId: true,
      fullName: true,
      username: true,
      email: true,
      navigationStyle: true,
      avatar: true,
      verified: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
      company: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          website: true,
          logo: true,
          taxNumber: true,
          invoiceHeader: true,
          invoiceFooter: true,
          signature: true,
          stamp: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return user;
});

export async function getCurrentCompanyId() {
  const user = await getCurrentUser();
  return user?.companyId ?? null;
}
