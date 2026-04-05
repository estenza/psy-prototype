import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_ACCESS_KEY_COOKIE_NAME,
  canAccessAdminConsole,
  clearAdminAccessKeyCookie,
  getConfiguredAdminAccessKey,
  isAdminConsoleEmail,
  isAdminConsoleHost,
  isValidAdminAccessKey,
  normalizeHost,
  resolveAdminAccessKey,
  setAdminAccessKeyCookie,
} from "@/features/admin/lib/admin-console";
import { logAdminAccessAttempt } from "@/features/admin/lib/admin-audit";
import { buildAdminRateLimitKey, consumeAdminRateLimit } from "@/features/admin/lib/admin-rate-limit";
import { buildAuthErrorResponse } from "@/features/auth/lib/auth-http";
import { AuthServiceError, deleteSessionByToken } from "@/features/auth/lib/auth-service";
import { setSessionCookie } from "@/features/auth/lib/session";
import { signIn } from "@/features/auth/lib/auth-service";
import type { AuthSuccessResponse, SignInInput } from "@/features/auth/types";

export const runtime = "nodejs";

type AdminAwareSignInInput = SignInInput & {
  adminAccessKey?: string;
};

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
    const input = (await request.json()) as AdminAwareSignInInput;
    const adminAccessKey = resolveAdminAccessKey({
      bodyValue: input.adminAccessKey,
      cookieValue: request.cookies.get(ADMIN_ACCESS_KEY_COOKIE_NAME)?.value ?? null,
      headerValue: request.headers.get("x-admin-access-key"),
    });

    if (adminConsoleRequest) {
      const rateLimitState = consumeAdminRateLimit(
        "admin-sign-in",
        buildAdminRateLimitKey({
          ip: requestIp,
          email: input.email,
        }),
      );

      if (!rateLimitState.allowed) {
        logAdminAccessAttempt({
          email: input.email,
          host: requestHost,
          ip: requestIp,
          userAgent,
          result: "forbidden",
        });
        throw new AuthServiceError({
          message: "Too many requests",
          status: 429,
        });
      }
    }

    if (adminConsoleRequest && !isValidAdminAccessKey(adminAccessKey)) {
      logAdminAccessAttempt({
        email: input.email,
        host: requestHost,
        ip: requestIp,
        userAgent,
        result: "forbidden",
      });
      throw new AuthServiceError({
        message: "Access denied",
        status: 403,
      });
    }

    if (adminConsoleRequest && !isAdminConsoleEmail(input.email)) {
      logAdminAccessAttempt({
        email: input.email,
        host: requestHost,
        ip: requestIp,
        userAgent,
        result: "forbidden",
      });
      throw new AuthServiceError({
        message: "Access denied",
        status: 403,
      });
    }

    const result = await signIn(input);

    if (adminConsoleRequest && !canAccessAdminConsole(result.user)) {
      await deleteSessionByToken(result.sessionToken);
      logAdminAccessAttempt({
        email: result.user.email,
        host: requestHost,
        ip: requestIp,
        userAgent,
        result: "forbidden",
      });

      throw new AuthServiceError({
        message: "Access denied",
        status: 403,
      });
    }

    if (adminConsoleRequest) {
      logAdminAccessAttempt({
        email: result.user.email,
        host: requestHost,
        ip: requestIp,
        userAgent,
        result: "success",
      });
    }

    const response = NextResponse.json<AuthSuccessResponse>({
      ok: true,
      user: result.user,
    });

    if (adminConsoleRequest) {
      if (getConfiguredAdminAccessKey() && adminAccessKey) {
        setAdminAccessKeyCookie(response);
      } else {
        clearAdminAccessKeyCookie(response);
      }
    }

    setSessionCookie(response, result.sessionToken, result.expiresAt);

    return response;
  } catch (error) {
    return buildAuthErrorResponse(error);
  }
}
