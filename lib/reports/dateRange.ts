/** Date-range presets for Reports filters (local calendar). */

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "year"
  | "custom";

export type ChartGranularity = "daily" | "weekly" | "monthly" | "yearly";

export type DateRange = {
  from: Date;
  to: Date;
  preset: DateRangePreset;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function resolveDateRange(
  preset: DateRangePreset,
  customFrom?: string | null,
  customTo?: string | null
): DateRange {
  const now = new Date();

  if (preset === "custom" && customFrom && customTo) {
    const from = startOfDay(new Date(customFrom));
    const to = endOfDay(new Date(customTo));
    if (
      !Number.isNaN(from.getTime()) &&
      !Number.isNaN(to.getTime()) &&
      from <= to
    ) {
      return { from, to, preset };
    }
  }

  switch (preset) {
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y), preset: "yesterday" };
    }
    case "week": {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 6);
      return { from, to: endOfDay(now), preset: "week" };
    }
    case "month": {
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: endOfDay(now),
        preset: "month",
      };
    }
    case "year": {
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: endOfDay(now),
        preset: "year",
      };
    }
    case "today":
    default:
      return {
        from: startOfDay(now),
        to: endOfDay(now),
        preset: "today",
      };
  }
}

export function parsePreset(value: string | null | undefined): DateRangePreset {
  switch (value) {
    case "yesterday":
    case "week":
    case "month":
    case "year":
    case "custom":
      return value;
    default:
      return "month";
  }
}

export function parseGranularity(
  value: string | null | undefined
): ChartGranularity {
  switch (value) {
    case "daily":
    case "weekly":
    case "yearly":
      return value;
    default:
      return "monthly";
  }
}

export const DATE_RANGE_OPTIONS: Array<{
  id: DateRangePreset;
  label: string;
}> = [
  { id: "today", label: "ئەمڕۆ" },
  { id: "yesterday", label: "دوێنێ" },
  { id: "week", label: "ئەم هەفتەیە" },
  { id: "month", label: "ئەم مانگە" },
  { id: "year", label: "ئەمساڵ" },
  { id: "custom", label: "مەودای تایبەت" },
];

export const GRANULARITY_OPTIONS: Array<{
  id: ChartGranularity;
  label: string;
}> = [
  { id: "daily", label: "ڕۆژانە" },
  { id: "weekly", label: "هەفتانە" },
  { id: "monthly", label: "مانگانە" },
  { id: "yearly", label: "ساڵانە" },
];
