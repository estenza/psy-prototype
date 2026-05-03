import { NextRequest, NextResponse } from "next/server";
import { clearAdminAccessKeyCookie } from "@/features/admin/lib/admin-console";
import { buildAuthErrorResponse } from "@/features/auth/lib/auth-http";
import { deleteOwnAccount, updateOwnProfile } from "@/features/auth/lib/auth-service";
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

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser({
      completeSkippableUserOnboarding: false,
    });

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Нужно войти в аккаунт, чтобы изменить профиль.",
        },
        {
          status: 401,
        },
      );
    }

    const payload = (await request.json().catch(() => ({}))) as {
      avatarSourceUrl?: unknown;
      avatarUrl?: unknown;
      displayName?: unknown;
      profileCoverUrl?: unknown;
      profileDescription?: unknown;
    };
    const updatedUser = await updateOwnProfile(currentUser, payload);

    return NextResponse.json<CurrentUserResponse>({
      user: updatedUser,
    });
  } catch (error) {
    return buildAuthErrorResponse(error);
  }
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
