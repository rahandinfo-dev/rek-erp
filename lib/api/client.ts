/**
 * Client-side fetch helper with retry, offline detection, and Kurdish errors.
 */

import { withRetry } from "@/lib/production/retry";

export type ApiResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: unknown;
};

export class ApiClientError extends Error {
  status: number;
  body: ApiResult | null;
  retryable: boolean;

  constructor(
    message: string,
    status: number,
    body: ApiResult | null = null,
    retryable = false
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
    this.retryable = retryable;
  }
}

export type ApiFetchOptions = RequestInit & {
  /** Disable automatic retries (default: retry GET / idempotent) */
  retries?: number;
  skipRetry?: boolean;
};

function isOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

async function parseBody<T>(res: Response): Promise<ApiResult<T> | null> {
  try {
    return (await res.json()) as ApiResult<T>;
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  input: RequestInfo | URL,
  init?: ApiFetchOptions
): Promise<ApiResult<T>> {
  if (!isOnline()) {
    throw new ApiClientError(
      "دەرهێڵیت. پەیوەندی ئینتەرنێت بپشکنە.",
      0,
      null,
      true
    );
  }

  const method = (init?.method || "GET").toUpperCase();
  const idempotent = method === "GET" || method === "HEAD";
  const retries = init?.skipRetry
    ? 0
    : init?.retries ?? (idempotent ? 2 : 0);

  const fetchInit: RequestInit = { ...(init || {}) };
  delete (fetchInit as ApiFetchOptions).retries;
  delete (fetchInit as ApiFetchOptions).skipRetry;

  return withRetry(
    async () => {
      let res: Response;
      try {
        res = await fetch(input, {
          ...fetchInit,
          headers: {
            Accept: "application/json",
            ...(fetchInit.body && !(fetchInit.body instanceof FormData)
              ? { "Content-Type": "application/json" }
              : {}),
            ...fetchInit.headers,
          },
        });
      } catch {
        throw new ApiClientError(
          "پەیوەندی بە سێرڤەر نەکرا. ئینتەرنێت بپشکنە.",
          0,
          null,
          true
        );
      }

      const body = await parseBody<T>(res);

      if (!res.ok || body?.success === false) {
        const retryable = res.status === 429 || res.status >= 500;
        const message =
          body?.message ||
          (res.status === 401
            ? "تکایە سەرەتا بچۆ ژوورەوە."
            : res.status === 403
              ? "دەسەڵاتت نییە بۆ ئەم کردارە."
              : res.status === 404
                ? "نەدۆزرایەوە."
                : res.status === 429
                  ? "هەوڵی زۆر درا. تکایە کەمێک چاوەڕێ بکە."
                  : res.status >= 500
                    ? "هەڵەیەکی ناوخۆیی ڕوویدا."
                    : "هەڵەیەک ڕوویدا.");
        throw new ApiClientError(message, res.status, body, retryable);
      }

      return body ?? { success: true };
    },
    {
      retries,
      shouldRetry: ({ error }) =>
        error instanceof ApiClientError ? error.retryable : true,
    }
  );
}

export function getErrorMessage(err: unknown, fallback = "هەڵەیەک ڕوویدا.") {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
