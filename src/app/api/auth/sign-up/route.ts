import { NextRequest, NextResponse } from "next/server";
import {
  isAdminConsoleHost,
  normalizeHost,
} from "@/features/admin/lib/admin-console";
import { logAdminAccessAttempt } from "@/features/admin/lib/admin-audit";
import { buildAdminRateLimitKey, consumeAdminRateLimit } from "@/features/admin/lib/admin-rate-limit";
import { buildAuthErrorResponse } from "@/features/auth/lib/auth-http";
import { setSessionCookie } from "@/features/auth/lib/session";
import { signUp } from "@/features/auth/lib/auth-service";
import type { AuthErrorResponse, AuthSuccessResponse, SignUpInput } from "@/features/auth/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const requestIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || null;
    const userAgent = request.headers.get("user-agent");
    const requestHost = normalizeHost(
      request.headers.get("x-forwarded-host") ??
        request.headers.get("host") ??
        request.nextUrl.host,
    );
    const adminConsoleRequest = isAdminConsoleHost(requestHost);

    if (adminConsoleRequest) {
      const rateLimitState = consumeAdminRateLimit(
        "admin-sign-in",
        buildAdminRateLimitKey({
          ip: requestIp,
        }),
      );
      logAdminAccessAttempt({
        host: requestHost,
        ip: requestIp,
        userAgent,
        result: "forbidden",
      });

      return NextResponse.json<AuthErrorResponse>(
        {
          error: rateLimitState.allowed ? "Access denied" : "Too many requests",
        },
        {
          status: rateLimitState.allowed ? 403 : 429,
        },
      );
    }

    const input = (await request.json()) as SignUpInput;
    const result = await signUp(input);
    const response = NextResponse.json<AuthSuccessResponse>({
      ok: true,
      user: result.user,
    });

    setSessionCookie(response, result.sessionToken, result.expiresAt);

    return response;
  } catch (error) {
    return buildAuthErrorResponse(error);
  }
}
