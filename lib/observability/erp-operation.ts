export type ErpOperation = "PURCHASE" | "SALE";

type ErrorDetails = {
  name?: string;
  constructor?: string;
  message?: string;
  code?: string;
  originalCode?: string;
  originalMessage?: string;
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
    name: string(outer?.name),
    constructor:
      error && typeof error === "object" ? error.constructor?.name : undefined,
    message: string(outer?.message),
    code: string(outer?.code),
    originalCode:
      string(driver?.code) === "DriverAdapterError"
        ? undefined
        : string(driver?.code),
    originalMessage: string(driver?.message),
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
  if (error instanceof SyntaxError) {
    return { status: 400, code: "INVALID_JSON", message: "داواکارییەکە JSON ـی دروست نییە." };
  }
  if (error instanceof Error && error.message.startsWith("INSUFFICIENT")) {
    return { status: 409, code: "INSUFFICIENT_STOCK", message: "کۆگای بەرهەم بەس نییە." };
  }
  if (details.code === "P2002" || details.originalCode === "23505") {
    return {
      status: 409,
      code: "DUPLICATE_DOCUMENT_NUMBER",
      message: "ژمارەی بەڵگە دووبارەیە؛ تکایە دووبارە هەوڵ بدەرەوە.",
    };
  }
  if (details.code === "P2003" || details.originalCode === "23503") {
    return {
      status: 400,
      code: "INVALID_RELATION",
      message:
        "یەکێک لە زانیارییە پەیوەستەکان نەدۆزرایەوە یان هی ئەم کۆمپانیایە نییە.",
    };
  }
  if (details.code === "P2025") {
    return {
      status: 409,
      code: "STALE_RECORD",
      message: "تۆمارە پێویستەکە گۆڕاوە؛ پەڕەکە نوێ بکەرەوە.",
    };
  }
  return {
    status: 500,
    code: "UNEXPECTED_DATABASE_ERROR",
    message: "تۆمارکردن سەرکەوتوو نەبوو. تکایە دووبارە هەوڵ بدەرەوە.",
  };
}

export function createErpTrace(
  operation: ErpOperation,
  correlationId = crypto.randomUUID(),
) {
  const enabled =
    process.env.ERP_TRANSACTION_DEBUG === "true";
  const started = performance.now();
  const log = (
    step: string,
    state: "START" | "OK" | "FAILED",
    since: number,
    error?: unknown,
  ) => {
    if (!enabled) return;
    const payload = {
      correlationId,
      operation,
      step,
      state,
      durationMs: Math.round((performance.now() - since) * 100) / 100,
      ...(error
        ? {
            error: databaseErrorDetails(error),
            stack: error instanceof Error ? error.stack : undefined,
          }
        : {}),
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
      log(step, "OK", at);
    },
    failed(step: string, at: number, error: unknown) {
      log(step, "FAILED", at, error);
    },
    committed(step: string) {
      log(step, "OK", started);
    },
  };
}
