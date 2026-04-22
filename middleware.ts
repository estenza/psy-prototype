import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminConsoleHost, normalizeAdminNextPath } from "@/features/admin/lib/admin-console";
import { SESSION_COOKIE_NAME } from "@/features/auth/constants";

const ADMIN_ALLOWED_PATH_PREFIXES = [
  "/access",
  "/admin",
  "/sign-in",
  "/api/auth",
  "/api/admin",
  "/api/app-environment",
  "/_next",
];

const ADMIN_ALLOWED_EXACT_PATHS = new Set(["/favicon.ico"]);

function isAdminRoute(pathname: string) {
  return (
    pathname === "/admin"
    || pathname.startsWith("/admin/")
    || pathname === "/api/admin"
    || pathname.startsWith("/api/admin/")
  );
}

function isAllowedAdminPath(pathname: string) {
  if (ADMIN_ALLOWED_EXACT_PATHS.has(pathname)) return true;
  return ADMIN_ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function isSignInPath(pathname: string) {
  return pathname === "/sign-in";
}

function isAdminAuthPagePath(pathname: string) {
  return pathname === "/sign-in" || pathname === "/access";
}

function buildSignInUrl(request: NextRequest) {
  const redirectUrl = new URL("/sign-in", request.url);
  const rawNextPath = isSignInPath(request.nextUrl.pathname)
    ? request.nextUrl.searchParams.get("next")
    : `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const nextPath = normalizeAdminNextPath(rawNextPath);

  if (nextPath !== "/sign-in") {
    redirectUrl.searchParams.set("next", nextPath);
  }

  return redirectUrl;
}

export function middleware(request: NextRequest) {
  const requestHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  const adminConsoleRequest = isAdminConsoleHost(requestHost);

  function withNoIndex(response: NextResponse) {
    if (adminConsoleRequest) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  }

  // Non-admin host: block admin routes
  if (!adminConsoleRequest) {
    if (isAdminRoute(request.nextUrl.pathname)) {
      return new NextResponse("Access denied", { status: 404 });
    }
    return NextResponse.next();
  }

  // Admin host: always pass through static assets, auth API, and the sign-in page
  if (
    ADMIN_ALLOWED_EXACT_PATHS.has(request.nextUrl.pathname)
    || request.nextUrl.pathname.startsWith("/_next/")
    || request.nextUrl.pathname.startsWith("/api/auth/")
    || isAdminAuthPagePath(request.nextUrl.pathname)
  ) {
    return withNoIndex(NextResponse.next());
  }

  const hasSession = Boolean(
    request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim(),
  );

  if (request.nextUrl.pathname === "/") {
    return withNoIndex(
      hasSession
        ? NextResponse.redirect(new URL("/admin/users", request.url))
        : NextResponse.redirect(buildSignInUrl(request)),
    );
  }

  if (!isAllowedAdminPath(request.nextUrl.pathname)) {
    if (isApiPath(request.nextUrl.pathname)) {
      return withNoIndex(
        NextResponse.json({ error: "Not found" }, { status: 404 }),
      );
    }

    return withNoIndex(new NextResponse("Not found", { status: 404 }));
  }

  // Admin host: no session → redirect to sign-in (or 401 for API)
  if (!hasSession) {
    if (isApiPath(request.nextUrl.pathname)) {
      return withNoIndex(
        NextResponse.json({ error: "Access denied" }, { status: 401 }),
      );
    }
    return withNoIndex(NextResponse.redirect(buildSignInUrl(request)));
  }

  // Admin host + session: allow only admin/auth paths
  if (isAllowedAdminPath(request.nextUrl.pathname)) {
    return withNoIndex(NextResponse.next());
  }
}

export const config = {
  matcher: ["/:path*"],
};
