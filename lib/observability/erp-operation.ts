export type ErpOperation = "PURCHASE" | "SALE";

type ErrorDetails = {
  code?: string;
  postgresCode?: string;
  constraint?: string;
  table?: string;
  column?: string;
  detail?: string;
  hint?: string;
};

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Extract the original Prisma/pg failure without logging request data or credentials. */
export function databaseErrorDetails(error: unknown): ErrorDetails {
  const outer = record(error);
  const chain: Record<string, unknown>[] = [];
  const seen = new Set<unknown>();
  let cursor = outer;
  while (cursor && !seen.has(cursor)) {
    chain.push(cursor);
    seen.add(cursor);
    cursor = record(cursor.cause);
  }
  // 25P02 only says that an earlier statement aborted the transaction. Prefer
  // the deepest concrete PostgreSQL failure so the root constraint is logged.
  const driver =
    [...chain]
      .reverse()
      .find(
        (entry) => typeof entry.code === "string" && entry.code !== "25P02",
      ) ?? chain.at(-1);
  const meta = record(outer?.meta);
  const target = Array.isArray(meta?.target)
    ? meta.target.join(",")
    : undefined;
  const string = (value: unknown) =>
    typeof value === "string" ? value : undefined;
  return {
    code: string(outer?.code),
    postgresCode:
      string(driver?.code) === "DriverAdapterError"
        ? undefined
        : string(driver?.code),
    constraint:
      string(driver?.constraint) ?? string(meta?.constraint) ?? target,
    table: string(driver?.table) ?? string(meta?.modelName),
    column: string(driver?.column),
    detail: string(driver?.detail),
    hint: string(driver?.hint),
  };
}

export function publicErpError(error: unknown) {
  const details = databaseErrorDetails(error);
  if (details.code === "P2002" || details.postgresCode === "23505") {
    return {
      status: 409,
      message: "ژمارەی بەڵگە دووبارەیە؛ تکایە دووبارە هەوڵ بدەرەوە.",
    };
  }
  if (details.code === "P2003" || details.postgresCode === "23503") {
    return {
      status: 400,
      message:
        "یەکێک لە زانیارییە پەیوەستەکان نەدۆزرایەوە یان هی ئەم کۆمپانیایە نییە.",
    };
  }
  if (details.code === "P2025") {
    return {
      status: 409,
      message: "تۆمارە پێویستەکە گۆڕاوە؛ پەڕەکە نوێ بکەرەوە.",
    };
  }
  return {
    status: 500,
    message: "تۆمارکردن سەرکەوتوو نەبوو. تکایە دووبارە هەوڵ بدەرەوە.",
  };
}

export function createErpTrace(
  operation: ErpOperation,
  correlationId = crypto.randomUUID(),
) {
  const enabled =
    process.env.ERP_DEBUG === "1" || process.env.ERP_DEBUG === "true";
  const started = performance.now();
  const log = (
    step: string,
    state: "START" | "SUCCESS" | "FAILED",
    since: number,
    error?: unknown,
  ) => {
    if (!enabled && state !== "FAILED") return;
    const payload = {
      correlationId,
      operation,
      step,
      state,
      durationMs: Math.round((performance.now() - since) * 100) / 100,
      ...(error ? { database: databaseErrorDetails(error) } : {}),
    };
    (state === "FAILED" ? console.error : console.info)(
      "ERP_OPERATION",
      payload,
      ...(error ? [error] : []),
    );
  };
  return {
    correlationId,
    start(step: string) {
      const at = performance.now();
      log(step, "START", at);
      return at;
    },
    ok(step: string, at: number) {
      log(step, "SUCCESS", at);
    },
    failed(step: string, at: number, error: unknown) {
      log(step, "FAILED", at, error);
    },
    committed(step: string) {
      log(step, "SUCCESS", started);
    },
  };
}
