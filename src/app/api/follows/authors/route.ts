import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { buildFollowErrorResponse } from "@/features/social/lib/follows-http";
import { toggleAuthorFollow } from "@/features/social/lib/follow-service";

export const runtime = "nodejs";

type AuthorFollowPayload = {
  followedUserId?: string;
  following?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Нужно войти в аккаунт, чтобы подписываться на авторов." },
        { status: 401 },
      );
    }

    const payload = (await request.json().catch(() => null)) as AuthorFollowPayload | null;
    const followedUserId = payload?.followedUserId?.trim() ?? "";

    if (!followedUserId) {
      return NextResponse.json(
        { error: "Автор не найден." },
        { status: 400 },
      );
    }

    const follow = await toggleAuthorFollow({
      actor: currentUser,
      followedUserId,
      following: payload?.following !== false,
    });

    return NextResponse.json({ follow, ok: true });
  } catch (error) {
    return buildFollowErrorResponse(error);
  }
}
