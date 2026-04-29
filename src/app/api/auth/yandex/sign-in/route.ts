import { NextRequest, NextResponse } from "next/server";
import { buildAuthErrorResponse } from "@/features/auth/lib/auth-http";
import { createSessionFromYandexToken } from "@/features/auth/lib/yandex-session";
import { setSessionCookie } from "@/features/auth/lib/session";
import type { AuthSuccessResponse } from "@/features/auth/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = (await request.json()) as {
      accessToken?: string;
    };

    const result = await createSessionFromYandexToken(accessToken ?? "");
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
