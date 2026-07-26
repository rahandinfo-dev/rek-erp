import { db } from "@/lib/prisma/db";
import type { Prisma } from "@/lib/prisma/client";

export async function logEmployeeHistory(input: {
  companyId: string;
  employeeId: string;
  action: string;
  message: string;
  actorId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await db.employeeHistory.create({
      data: {
        companyId: input.companyId,
        employeeId: input.employeeId,
        action: input.action,
        message: input.message,
        actorId: input.actorId ?? null,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("EMPLOYEE HISTORY ERROR:", error);
  }
}

export function toDateOnly(value: string | Date) {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
    );
  }
  const raw = value.includes("T") ? value.slice(0, 10) : value;
  const [y, m, d] = raw.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function parseOptionalDate(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return toDateOnly(trimmed);
}
