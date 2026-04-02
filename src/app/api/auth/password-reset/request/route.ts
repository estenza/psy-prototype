import { NextRequest, NextResponse } from "next/server";
import { buildAuthErrorResponse } from "@/features/auth/lib/auth-http";
import { requestPasswordReset } from "@/features/auth/lib/auth-service";
import type {
  AuthMessageResponse,
  PasswordResetRequestInput,
} from "@/features/auth/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as PasswordResetRequestInput;
    const result = await requestPasswordReset(input, {
      origin: request.nextUrl.origin,
    });

    return NextResponse.json<AuthMessageResponse>({
      debugResetUrl: result.debugResetUrl,
      message: result.message,
      ok: true,
    });
  } catch (error) {
    return buildAuthErrorResponse(error);
  }
}
