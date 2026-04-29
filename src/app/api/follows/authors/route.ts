import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { setAuthorFollow } from "@/features/notifications/lib/notifications-repository";

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

    await setAuthorFollow({
      actor: currentUser,
      followedUserId,
      following: payload?.following !== false,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось обновить подписку.",
      },
      {
        status: 500,
      },
    );
  }
}
