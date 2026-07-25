import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { assertSameOrigin } from "@/lib/security/csrf";

const publicRoutes = new Set([
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/verify-reset-otp",
  "/reset-password",
]);

const publicApiPrefixes = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify-email",
  "/api/auth/forgot-password",
  "/api/auth/verify-reset-otp",
  "/api/auth/reset-password",
  "/api/auth/resend-code",
  "/api/health",
];

function isPublicApi(pathname: string) {
  return publicApiPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function withSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-site");
  return res;
}

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const csrfBlock = assertSameOrigin(req);
    if (csrfBlock) return withSecurityHeaders(csrfBlock);

    if (isPublicApi(pathname)) {
      return withSecurityHeaders(NextResponse.next());
    }

    if (!token) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            message: "تکایە سەرەتا بچۆ ژوورەوە.",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        )
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      const res = NextResponse.json(
        {
          success: false,
          message: "دانیشتن بەسەرچوو. دووبارە بچۆ ژوورەوە.",
          code: "SESSION_EXPIRED",
        },
        { status: 401 }
      );
      res.cookies.delete("token");
      return withSecurityHeaders(res);
    }

    return withSecurityHeaders(NextResponse.next());
  }

  if (publicRoutes.has(pathname)) {
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        return withSecurityHeaders(
          NextResponse.redirect(new URL("/dashboard", req.url))
        );
      }
    }
    return withSecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/dashboard") || pathname === "/") {
    if (!token) {
      return withSecurityHeaders(
        NextResponse.redirect(new URL("/login", req.url))
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      const response = NextResponse.redirect(new URL("/login", req.url));
      response.cookies.delete("token");
      return withSecurityHeaders(response);
    }

    if (pathname === "/") {
      return withSecurityHeaders(
        NextResponse.redirect(new URL("/dashboard", req.url))
      );
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/api/:path*",
    "/login",
    "/register",
    "/verify-email",
    "/forgot-password",
    "/verify-reset-otp",
    "/reset-password",
  ],
};
