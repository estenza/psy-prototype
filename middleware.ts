import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PRODUCTION_UNAVAILABLE_HOSTS = new Set([
  "vnutri.live",
  "www.vnutri.live",
]);

function normalizeRequestHost(host: string | null | undefined) {
  return (host ?? "").split(":")[0]?.trim().toLowerCase() ?? "";
}

function isProductionPublicHostUnavailable(host: string | null | undefined) {
  return process.env.APP_ENV === "production"
    && PRODUCTION_UNAVAILABLE_HOSTS.has(normalizeRequestHost(host));
}

export function middleware(request: NextRequest) {
  const requestHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;

  if (isProductionPublicHostUnavailable(requestHost)) {
    return new NextResponse("Service temporarily unavailable", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": "3600",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
