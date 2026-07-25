/**
 * Lightweight structured logging for production diagnostics.
 * Avoids leaking secrets; safe for API / background jobs.
 */

type LogLevel = "info" | "warn" | "error";

export type MonitorEvent = {
  level: LogLevel;
  area: string;
  message: string;
  companyId?: string | null;
  userId?: string | null;
  code?: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
};

function scrub(meta?: Record<string, unknown>) {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (/password|secret|token|authorization|cookie/i.test(k)) {
      out[k] = "[redacted]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function monitor(event: MonitorEvent) {
  const payload = {
    ts: new Date().toISOString(),
    ...event,
    meta: scrub(event.meta),
  };
  const line = JSON.stringify(payload);
  if (event.level === "error") console.error(line);
  else if (event.level === "warn") console.warn(line);
  else if (process.env.NODE_ENV !== "production") console.info(line);
}

export function monitorError(
  area: string,
  err: unknown,
  extra?: Omit<MonitorEvent, "level" | "area" | "message">
) {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
  monitor({
    level: "error",
    area,
    message,
    ...extra,
    meta: {
      ...(extra?.meta || {}),
      name: err instanceof Error ? err.name : undefined,
    },
  });
}
