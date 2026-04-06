import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ADMIN_ACCESS_KEY_COOKIE_NAME,
  isAdminConsoleHost,
  isValidAdminAccessKey,
  resolveAdminAccessKey,
} from "@/features/admin/lib/admin-console";
import { buildAdminRateLimitKey, consumeAdminRateLimit } from "@/features/admin/lib/admin-rate-limit";

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

const ADMIN_ACCESS_GATE_PATH = "/access";
const ADMIN_ACCESS_GATE_API_PATH = "/api/auth/admin-access";

const ADMIN_ALLOWED_EXACT_PATHS = new Set([
  "/favicon.ico",
]);

const ADMIN_PROOF_BYPASS_PATH_PREFIXES = [
  "/_next",
];

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

function isAdminAccessGatePath(pathname: string) {
  return pathname === ADMIN_ACCESS_GATE_PATH;
}

function isAdminAccessGateApiPath(pathname: string) {
  return pathname === ADMIN_ACCESS_GATE_API_PATH;
}

function isAdminProofBypassPath(pathname: string) {
  if (ADMIN_ALLOWED_EXACT_PATHS.has(pathname)) {
    return true;
  }

  return ADMIN_PROOF_BYPASS_PATH_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAdminSensitivePath(pathname: string) {
  return isAdminRoute(pathname)
    || pathname === "/api/auth/sign-in"
    || pathname === "/api/auth/sign-up";
}

function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function buildAccessGateUrl(request: NextRequest) {
  const redirectUrl = new URL(ADMIN_ACCESS_GATE_PATH, request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (nextPath !== ADMIN_ACCESS_GATE_PATH) {
    redirectUrl.searchParams.set("next", nextPath);
  }

  return redirectUrl;
}

export function middleware(request: NextRequest) {
  const requestHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  const requestIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || null;
  const userAgent = request.headers.get("user-agent");
  const adminConsoleRequest = isAdminConsoleHost(requestHost);

  function withAdminNoIndexHeader(response: NextResponse) {
    if (adminConsoleRequest) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }

    return response;
  }

  if (!adminConsoleRequest) {
    if (isAdminRoute(request.nextUrl.pathname) || isAdminAccessGatePath(request.nextUrl.pathname)) {
      console.info("[admin-access]", {
        timestamp: new Date().toISOString(),
        email: null,
        host: requestHost,
        ip: requestIp,
        userAgent,
        result: "forbidden",
      });
      return new NextResponse("Access denied", { status: 404 });
    }

    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/sign-up") {
    return withAdminNoIndexHeader(NextResponse.redirect(new URL("/sign-in", request.url)));
  }

  if (
    isAdminAccessGatePath(request.nextUrl.pathname)
    || isAdminAccessGateApiPath(request.nextUrl.pathname)
    || isAdminProofBypassPath(request.nextUrl.pathname)
  ) {
    return withAdminNoIndexHeader(NextResponse.next());
  }

  const adminAccessKey = resolveAdminAccessKey({
    cookieValue: request.cookies.get(ADMIN_ACCESS_KEY_COOKIE_NAME)?.value ?? null,
    headerValue: request.headers.get("x-admin-access-key"),
  });

  if (!isValidAdminAccessKey(adminAccessKey)) {
    if (isApiPath(request.nextUrl.pathname)) {
      const rateLimitState = consumeAdminRateLimit(
        "admin-gate",
        buildAdminRateLimitKey({
          ip: requestIp,
        }),
      );

      if (isAdminSensitivePath(request.nextUrl.pathname)) {
        console.info("[admin-access]", {
          timestamp: new Date().toISOString(),
          email: null,
          host: requestHost,
          ip: requestIp,
          userAgent,
          result: "forbidden",
        });
      }

      return withAdminNoIndexHeader(
        NextResponse.json(
          {
            error: "Access denied",
          },
          {
            status: rateLimitState.allowed ? 403 : 429,
          },
        ),
      );
    }

    console.info("[admin-access]", {
      timestamp: new Date().toISOString(),
      email: null,
      host: requestHost,
      ip: requestIp,
      userAgent,
      result: "forbidden",
    });

    return withAdminNoIndexHeader(NextResponse.redirect(buildAccessGateUrl(request)));
  }

  if (isAllowedAdminPath(request.nextUrl.pathname)) {
    return withAdminNoIndexHeader(NextResponse.next());
  }

  return withAdminNoIndexHeader(NextResponse.redirect(new URL("/admin/users", request.url)));
}

export const config = {
  matcher: ["/:path*"],
};
