export type FieldDiff = {
  field: string;
  before: unknown;
  after: unknown;
  changed: boolean;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

/** Field-level before/after comparison for version history. */
export function compareValues(
  oldValue: unknown,
  newValue: unknown
): FieldDiff[] {
  if (!isObject(oldValue) && !isObject(newValue)) {
    const changed = JSON.stringify(oldValue) !== JSON.stringify(newValue);
    return changed
      ? [{ field: "value", before: oldValue, after: newValue, changed: true }]
      : [];
  }

  const a = isObject(oldValue) ? oldValue : {};
  const b = isObject(newValue) ? newValue : {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: FieldDiff[] = [];

  for (const field of keys) {
    const before = a[field];
    const after = b[field];
    let changed = true;
    try {
      changed = JSON.stringify(before) !== JSON.stringify(after);
    } catch {
      changed = before !== after;
    }
    if (!changed) continue;
    out.push({ field, before, after, changed: true });
  }

  return out;
}

export function recordDisplayName(row: {
  summary?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  newValue?: unknown;
  oldValue?: unknown;
}): string {
  if (row.summary) return row.summary;
  const nv = row.newValue as Record<string, unknown> | null;
  const ov = row.oldValue as Record<string, unknown> | null;
  const name =
    (nv && (nv.name || nv.fullName || nv.title || nv.sku)) ||
    (ov && (ov.name || ov.fullName || ov.title || ov.sku));
  if (typeof name === "string" && name.trim()) return name;
  if (row.entityType && row.entityId) {
    return `${row.entityType} · ${row.entityId.slice(0, 8)}`;
  }
  return "Activity";
}
