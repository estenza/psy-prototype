import { NextResponse } from "next/server";
import { clearAdminAccessKeyCookie } from "@/features/admin/lib/admin-console";
import { buildAuthErrorResponse } from "@/features/auth/lib/auth-http";
import { deleteOwnAccount } from "@/features/auth/lib/auth-service";
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

export async function DELETE() {
  try {
    const currentUser = await getCurrentUser({
      completeSkippableUserOnboarding: false,
    });

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Нужно войти в аккаунт, чтобы удалить его.",
        },
        {
          status: 401,
        },
      );
    }

    await deleteOwnAccount(currentUser);

    const response = NextResponse.json({
      ok: true,
    });

    clearAdminAccessKeyCookie(response);
    clearSessionCookie(response);

    return response;
  } catch (error) {
    return buildAuthErrorResponse(error);
  }
}
