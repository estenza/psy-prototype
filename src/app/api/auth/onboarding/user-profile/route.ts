import { NextRequest, NextResponse } from "next/server";
import { buildAuthErrorResponse } from "@/features/auth/lib/auth-http";
import { requireCurrentUser } from "@/features/auth/lib/current-user";
import { completeUserProfile } from "@/features/auth/lib/auth-service";
import type { AuthSuccessResponse, CompleteUserProfileInput } from "@/features/auth/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireCurrentUser();
    const input = (await request.json()) as CompleteUserProfileInput;
    const user = await completeUserProfile(currentUser, input);

    return NextResponse.json<AuthSuccessResponse>({
      ok: true,
      user,
    });
  } catch (error) {
    return buildAuthErrorResponse(error);
  }
}
