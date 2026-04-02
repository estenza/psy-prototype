import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { clearSessionCookie, readSessionTokenFromCookies } from "@/features/auth/lib/session";
import type { CurrentUserResponse } from "@/features/auth/types";

export const runtime = "nodejs";

export async function GET() {
  const [sessionToken, currentUser] = await Promise.all([
    readSessionTokenFromCookies(),
    getCurrentUser(),
  ]);

  const response = NextResponse.json<CurrentUserResponse>(
    {
      user: currentUser,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  if (sessionToken && !currentUser) {
    clearSessionCookie(response);
  }

  return response;
}
