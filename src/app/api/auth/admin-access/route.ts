import { NextRequest, NextResponse } from "next/server";
import {
  clearAdminAccessKeyCookie,
  isAdminConsoleHost,
  isValidAdminAccessKey,
  normalizeHost,
  setAdminAccessKeyCookie,
} from "@/features/admin/lib/admin-console";
import { logAdminAccessAttempt } from "@/features/admin/lib/admin-audit";
import { buildAdminRateLimitKey, consumeAdminRateLimit } from "@/features/admin/lib/admin-rate-limit";

export const runtime = "nodejs";

type AdminAccessInput = {
  adminAccessKey?: string;
};

export async function POST(request: NextRequest) {
  const requestIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || null;
  const userAgent = request.headers.get("user-agent");
  const requestHost = normalizeHost(
    request.headers.get("x-forwarded-host")
      ?? request.headers.get("host")
      ?? request.nextUrl.host,
  );

  if (!isAdminConsoleHost(requestHost)) {
    return NextResponse.json(
      {
        error: "Access denied",
      },
      {
        status: 404,
      },
    );
  }

  const rateLimitState = consumeAdminRateLimit(
    "admin-gate",
    buildAdminRateLimitKey({
      ip: requestIp,
    }),
  );

  if (!rateLimitState.allowed) {
    logAdminAccessAttempt({
      host: requestHost,
      ip: requestIp,
      userAgent,
      result: "forbidden",
    });

    return NextResponse.json(
      {
        error: "Access denied",
      },
      {
        status: 429,
      },
    );
  }

  const input = (await request.json()) as AdminAccessInput;

  if (!isValidAdminAccessKey(input.adminAccessKey)) {
    logAdminAccessAttempt({
      host: requestHost,
      ip: requestIp,
      userAgent,
      result: "forbidden",
    });

    const response = NextResponse.json(
      {
        error: "Access denied",
      },
      {
        status: 403,
      },
    );

    clearAdminAccessKeyCookie(response);

    return response;
  }

  logAdminAccessAttempt({
    host: requestHost,
    ip: requestIp,
    userAgent,
    result: "success",
  });

  const response = NextResponse.json({
    ok: true,
  });

  setAdminAccessKeyCookie(response, input.adminAccessKey?.trim() || "");

  return response;
}
