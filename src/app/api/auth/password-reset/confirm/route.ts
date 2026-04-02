import { NextRequest, NextResponse } from "next/server";
import { buildAuthErrorResponse } from "@/features/auth/lib/auth-http";
import { resetPassword } from "@/features/auth/lib/auth-service";
import type {
  AuthMessageResponse,
  PasswordResetConfirmInput,
} from "@/features/auth/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as PasswordResetConfirmInput;
    const result = await resetPassword(input);

    return NextResponse.json<AuthMessageResponse>({
      message: result.message,
      ok: true,
    });
  } catch (error) {
    return buildAuthErrorResponse(error);
  }
}
