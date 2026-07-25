import { NextRequest, NextResponse } from "next/server";

/**
 * Block cross-site state-changing requests (basic CSRF defense).
 * Same-origin SPA fetches are allowed; browsers send Origin on POST/PUT/PATCH/DELETE.
 */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  const origin = req.headers.get("origin");
  if (!origin) {
    // Non-browser clients / same-origin navigations may omit Origin
    return null;
  }

  try {
    const reqHost = req.nextUrl.host;
    const originHost = new URL(origin).host;
    if (originHost !== reqHost) {
      return NextResponse.json(
        {
          success: false,
          message: "داواکاری نادروست.",
          code: "CSRF_ORIGIN",
        },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "داواکاری نادروست.",
        code: "CSRF_ORIGIN",
      },
      { status: 403 }
    );
  }

  return null;
}
