import { NextResponse } from "next/server";
import { buildAuthErrorResponse } from "@/features/auth/lib/auth-http";
import { buildDefaultUserDisplayName } from "@/features/auth/lib/auth-service";
import { requireCurrentUser } from "@/features/auth/lib/current-user";

export const runtime = "nodejs";

export async function GET() {
  try {
    const currentUser = await requireCurrentUser({
      completeSkippableUserOnboarding: false,
    });
    const displayName = await buildDefaultUserDisplayName(currentUser.id);

    return NextResponse.json({
      displayName,
    });
  } catch (error) {
    return buildAuthErrorResponse(error);
  }
}
