import { NextRequest, NextResponse } from "next/server";
import { buildAuthErrorResponse } from "@/features/auth/lib/auth-http";
import { setSessionCookie } from "@/features/auth/lib/session";
import { signIn } from "@/features/auth/lib/auth-service";
import type { AuthSuccessResponse, SignInInput } from "@/features/auth/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as SignInInput;
    const result = await signIn(input);
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
