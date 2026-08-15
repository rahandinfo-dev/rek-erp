export function previousStateValue<T extends string>(
  metadata: unknown,
  key: string,
  allowed: readonly T[],
  fallback: T
): T {
  if (!metadata || typeof metadata !== "object") return fallback;
  const previousValue = (metadata as { previousValue?: unknown }).previousValue;
  if (!previousValue || typeof previousValue !== "object") return fallback;
  const value = (previousValue as Record<string, unknown>)[key];
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

export function requiredPreviousStateValue<T extends string>(
  metadata: unknown,
  key: string,
  allowed: readonly T[]
): T | null {
  if (!metadata || typeof metadata !== "object") return null;
  const previousValue = (metadata as { previousValue?: unknown }).previousValue;
  if (!previousValue || typeof previousValue !== "object") return null;
  const value = (previousValue as Record<string, unknown>)[key];
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : null;
}

export function sameCompany(actorCompanyId: string, recordCompanyId: string) {
  return actorCompanyId === recordCompanyId;
}

export function masterDeleteData(userId: string, deletedAt = new Date()) {
  return {
    active: false,
    deletedAt,
    deletedById: userId,
  } as const;
}

export function masterRestoreData() {
  return {
    active: true,
    deletedAt: null,
    deletedById: null,
  } as const;
}

export function isMasterRecordVisible(record: { deletedAt: Date | null }) {
  return record.deletedAt === null;
}
