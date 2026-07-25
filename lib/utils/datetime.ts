/**
 * Every timestamp in the UI is formatted against one fixed locale and time
 * zone. `toLocaleDateString()` / `toLocaleString()` otherwise resolve against
 * the *runtime's* locale and TZ, which differ between the Node server and the
 * browser — producing different HTML on the server render and the hydration
 * render.
 *
 * Pinning both sides also means every screen shows the same business day for
 * the same record, regardless of where the server happens to be deployed.
 */
export const APP_LOCALE = "en-GB";

export const APP_TIME_ZONE =
  process.env.NEXT_PUBLIC_APP_TIME_ZONE || "Asia/Baghdad";

export type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatter(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    ...options,
  });
}

// Intl formatters are expensive to construct — build each shape once.
const dateFmt = formatter({
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFmt = formatter({
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const timeWithSecondsFmt = formatter({
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `25/07/2026` */
export function formatDate(value: DateInput, fallback = ""): string {
  const d = toDate(value);
  return d ? dateFmt.format(d) : fallback;
}

/** `03:49` — pass `withSeconds` for `03:49:12`. */
export function formatTime(
  value: DateInput,
  withSeconds = false,
  fallback = ""
): string {
  const d = toDate(value);
  if (!d) return fallback;
  return (withSeconds ? timeWithSecondsFmt : timeFmt).format(d);
}

/** `25/07/2026, 03:49` */
export function formatDateTime(
  value: DateInput,
  withSeconds = false,
  fallback = ""
): string {
  const d = toDate(value);
  if (!d) return fallback;
  return `${dateFmt.format(d)}, ${
    (withSeconds ? timeWithSecondsFmt : timeFmt).format(d)
  }`;
}

/** Split form used by the server-side row mappers. */
export function splitDateTime(value: DateInput, withSeconds = true) {
  const d = toDate(value);
  return {
    date: formatDate(d),
    time: formatTime(d, withSeconds),
  };
}

/**
 * `YYYY-MM-DD` in the app time zone — the value `<input type="date">` expects.
 * Using UTC here would roll the default over three hours early.
 */
export function toDateInputValue(value: DateInput = new Date()): string {
  const d = toDate(value);
  return d ? dayKeyFmt.format(d) : "";
}

/**
 * Day number in the app time zone — lets "Today" / "Yesterday" buckets resolve
 * to the same group on the server and in the browser.
 */
export function civilDayIndex(value: DateInput): number {
  const d = toDate(value) ?? new Date();
  const [year, month, day] = dayKeyFmt.format(d).split("-").map(Number);
  return Math.floor(Date.UTC(year!, month! - 1, day!) / 86_400_000);
}

/** Whole days between two instants, measured in app-time-zone calendar days. */
export function civilDaysBetween(from: DateInput, to: DateInput): number {
  return civilDayIndex(to) - civilDayIndex(from);
}
