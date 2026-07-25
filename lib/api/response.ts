import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { monitorError } from "@/lib/production/monitor";
import type { RateLimitResult } from "@/lib/security/rate-limit";

export type ApiSuccess<T = unknown> = {
  success: true;
  message?: string;
  data?: T;
  [key: string]: unknown;
};

export type ApiFailure = {
  success: false;
  message: string;
  code?: string;
  errors?: unknown;
};

/** Standard JSON success response */
export function apiOk<T = unknown>(
  data?: T,
  init?: { message?: string; status?: number; extra?: Record<string, unknown> }
) {
  const body: Record<string, unknown> = {
    success: true,
    ...(init?.message ? { message: init.message } : {}),
    ...(data !== undefined ? { data } : {}),
    ...init?.extra,
  };
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

/** Standard JSON error response */
export function apiFail(
  message: string,
  status = 400,
  extra?: { code?: string; errors?: unknown; headers?: HeadersInit }
) {
  const body: ApiFailure = {
    success: false,
    message,
    ...(extra?.code ? { code: extra.code } : {}),
    ...(extra?.errors !== undefined ? { errors: extra.errors } : {}),
  };
  return NextResponse.json(body, {
    status,
    headers: extra?.headers,
  });
}

export function apiUnauthorized(message = "تکایە سەرەتا بچۆ ژوورەوە.") {
  return apiFail(message, 401, { code: "UNAUTHORIZED" });
}

export function apiForbidden(message = "دەسەڵاتت نییە بۆ ئەم کردارە.") {
  return apiFail(message, 403, { code: "FORBIDDEN" });
}

export function apiNotFound(message = "نەدۆزرایەوە.") {
  return apiFail(message, 404, { code: "NOT_FOUND" });
}

export function apiServerError(message = "هەڵەیەکی ناوخۆیی ڕوویدا.") {
  return apiFail(message, 500, { code: "INTERNAL" });
}

/** 429 with Retry-After for clients / load balancers */
export function apiRateLimited(
  limited: RateLimitResult,
  message = "هەوڵی زۆر درا. تکایە کەمێک چاوەڕێ بکە."
) {
  return apiFail(message, 429, {
    code: "RATE_LIMITED",
    headers: {
      "Retry-After": String(limited.retryAfterSec),
      "X-RateLimit-Remaining": String(limited.remaining),
    },
  });
}

/**
 * Require authenticated user for API routes.
 * Returns `{ user }` or a ready-to-return 401 Response.
 */
export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: apiUnauthorized() } as const;
  }
  return { user, response: null } as const;
}

/** Wrap route handlers with consistent try/catch + monitoring */
export function withApiHandler(
  handler: (req: Request, ctx?: unknown) => Promise<Response>,
  area = "api"
) {
  return async (req: Request, ctx?: unknown) => {
    const started = Date.now();
    try {
      return await handler(req, ctx);
    } catch (err) {
      monitorError(area, err, {
        durationMs: Date.now() - started,
        meta: { method: req.method, url: req.url },
      });
      return apiServerError();
    }
  };
}
