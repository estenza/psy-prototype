import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ADMIN_ACCESS_KEY_COOKIE_NAME,
  isAdminConsoleHost,
  isValidAdminAccessKey,
  resolveAdminAccessKey,
} from "@/features/admin/lib/admin-console";

const ADMIN_ALLOWED_PATH_PREFIXES = [
  "/admin",
  "/sign-in",
  "/forgot-password",
  "/reset-password",
  "/complete-profile",
  "/api/auth",
  "/api/admin",
  "/api/app-environment",
  "/_next",
];

const ADMIN_ALLOWED_EXACT_PATHS = new Set([
  "/favicon.ico",
]);

function isAdminRoute(pathname: string) {
  return pathname === "/admin"
    || pathname.startsWith("/admin/")
    || pathname === "/api/admin"
    || pathname.startsWith("/api/admin/");
}

function isAllowedAdminPath(pathname: string) {
  if (ADMIN_ALLOWED_EXACT_PATHS.has(pathname)) {
    return true;
  }

  return ADMIN_ALLOWED_PATH_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAdminSensitivePath(pathname: string) {
  return isAdminRoute(pathname)
    || pathname === "/api/auth/sign-in"
    || pathname === "/api/auth/sign-up";
}

export function middleware(request: NextRequest) {
  const requestHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  const adminConsoleRequest = isAdminConsoleHost(requestHost);

  function withAdminNoIndexHeader(response: NextResponse) {
    if (adminConsoleRequest) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }

    return response;
  }

  if (!adminConsoleRequest) {
    if (isAdminRoute(request.nextUrl.pathname)) {
      console.info("[admin-access]", {
        timestamp: new Date().toISOString(),
        email: null,
        host: requestHost,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          || request.headers.get("x-real-ip")
          || null,
        userAgent: request.headers.get("user-agent"),
        result: "forbidden",
      });
      return new NextResponse("Access denied", { status: 404 });
    }

    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/sign-up") {
    return withAdminNoIndexHeader(NextResponse.redirect(new URL("/sign-in", request.url)));
  }

  const adminAccessKey = resolveAdminAccessKey({
    cookieValue: request.cookies.get(ADMIN_ACCESS_KEY_COOKIE_NAME)?.value ?? null,
    headerValue: request.headers.get("x-admin-access-key"),
  });

  if (
    isAdminSensitivePath(request.nextUrl.pathname)
    && !isValidAdminAccessKey(adminAccessKey)
  ) {
    console.info("[admin-access]", {
      timestamp: new Date().toISOString(),
      email: null,
      host: requestHost,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || request.headers.get("x-real-ip")
        || null,
      userAgent: request.headers.get("user-agent"),
      result: "forbidden",
    });
    return withAdminNoIndexHeader(new NextResponse("Access denied", { status: 403 }));
  }

  if (isAllowedAdminPath(request.nextUrl.pathname)) {
    return withAdminNoIndexHeader(NextResponse.next());
  }

  return withAdminNoIndexHeader(NextResponse.redirect(new URL("/admin/users", request.url)));
}

export const config = {
  matcher: ["/:path*"],
};
