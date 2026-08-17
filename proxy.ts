import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { assertSameOrigin } from "@/lib/security/csrf";
import { getSuperAdminFromSessionToken, SUPER_ADMIN_COOKIE } from "@/lib/super-admin/auth";
import {
  getSubscriptionEntitlement,
  PROTECTED_SUBSCRIPTION_API_PREFIXES,
  SUBSCRIPTION_LOCK_MESSAGE,
} from "@/lib/subscriptions/service";

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

function isProtectedSubscriptionApi(pathname: string) {
  return PROTECTED_SUBSCRIPTION_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function adminUnauthorized() {
  return NextResponse.json(
    { success: false, code: "SUPER_ADMIN_UNAUTHORIZED" },
    { status: 401 }
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
  const superAdminToken = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  const { pathname } = req.nextUrl;

  // The platform-admin surface intentionally does not trust a tenant User
  // token. It has its own database-backed, hashed session cookie.
  if (pathname.startsWith("/api/admin/")) {
    const csrfBlock = assertSameOrigin(req);
    if (csrfBlock) return withSecurityHeaders(csrfBlock);
    if (pathname === "/api/admin/auth/login") return withSecurityHeaders(NextResponse.next());

    const admin = await getSuperAdminFromSessionToken(superAdminToken);
    if (!admin) return withSecurityHeaders(adminUnauthorized());
    if (
      admin.mustChangePassword &&
      pathname !== "/api/admin/auth/change-password" &&
      pathname !== "/api/admin/auth/logout"
    ) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, code: "SUPER_ADMIN_PASSWORD_CHANGE_REQUIRED" }, { status: 403 })
      );
    }
    return withSecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/admin")) {
    const admin = await getSuperAdminFromSessionToken(superAdminToken);
    if (pathname === "/admin/login") {
      if (admin) {
        return withSecurityHeaders(
          NextResponse.redirect(new URL(admin.mustChangePassword ? "/admin/change-password" : "/admin", req.url))
        );
      }
      return withSecurityHeaders(NextResponse.next());
    }
    if (!admin) {
      return withSecurityHeaders(NextResponse.redirect(new URL("/admin/login", req.url)));
    }
    if (admin.mustChangePassword && pathname !== "/admin/change-password") {
      return withSecurityHeaders(NextResponse.redirect(new URL("/admin/change-password", req.url)));
    }
    return withSecurityHeaders(NextResponse.next());
  }

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

    // Every authenticated request evaluates the tenant's server-side
    // entitlement. Reads remain available so the ERP stays read-only, while
    // mutations are stopped before any route handler can change data.
    try {
      const entitlement = await getSubscriptionEntitlement(payload.companyId);
      if (
        isProtectedSubscriptionApi(pathname) &&
        !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
        !entitlement.active
      ) {
        return withSecurityHeaders(
          NextResponse.json(
            { success: false, message: SUBSCRIPTION_LOCK_MESSAGE, code: "SUBSCRIPTION_REQUIRED" },
            { status: 403 }
          )
        );
      }
    } catch (error) {
      console.error("SUBSCRIPTION_PROXY_CHECK_ERROR", error);
      if (isProtectedSubscriptionApi(pathname) && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return withSecurityHeaders(
          NextResponse.json(
            { success: false, message: "نەتوانرا بەشداربوون پشتڕاست بکرێتەوە.", code: "SUBSCRIPTION_CHECK_FAILED" },
            { status: 503 }
          )
        );
      }
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

    // Keep expiration/revocation current for every authenticated dashboard
    // request. Route layouts render the locked, read-only experience.
    try {
      await getSubscriptionEntitlement(payload.companyId);
    } catch (error) {
      console.error("SUBSCRIPTION_DASHBOARD_CHECK_ERROR", error);
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
    "/admin",
    "/admin/:path*",
    "/api/:path*",
    "/login",
    "/register",
    "/verify-email",
    "/forgot-password",
    "/verify-reset-otp",
    "/reset-password",
  ],
};
