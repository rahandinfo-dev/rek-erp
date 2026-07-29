export type ErpErrorPayload = {
  message?: unknown;
  correlationId?: unknown;
};

/** Parse an API failure without replacing safe server messages with a generic one. */
export async function erpResponseError(
  response: Response,
  fallback: string,
): Promise<string> {
  let payload: ErpErrorPayload = {};
  try {
    payload = (await response.json()) as ErpErrorPayload;
  } catch {
    // An empty/proxy-generated response has no safe application message.
  }
  const message =
    typeof payload.message === "string" && payload.message.trim()
      ? payload.message.trim()
      : fallback;
  const correlationId =
    typeof payload.correlationId === "string" && payload.correlationId.trim()
      ? payload.correlationId.trim()
      : response.headers.get("x-correlation-id")?.trim();
  return correlationId ? `${message} (${correlationId})` : message;
}
