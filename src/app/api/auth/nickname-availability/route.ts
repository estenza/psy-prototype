import { NextRequest, NextResponse } from "next/server";
import { checkNicknameAvailability } from "@/features/auth/lib/auth-service";
import type { NicknameAvailabilityResponse } from "@/features/auth/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const nickname = request.nextUrl.searchParams.get("nickname") ?? "";
  const result = checkNicknameAvailability(nickname);

  return NextResponse.json<NicknameAvailabilityResponse>(result);
}
