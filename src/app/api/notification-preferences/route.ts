import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/features/notifications/lib/notifications-repository";
import type { NotificationPreferences } from "@/features/auth/types";

export const runtime = "nodejs";

function readPreferencePatch(payload: unknown): Partial<NotificationPreferences> {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const source = payload as Partial<Record<keyof NotificationPreferences, unknown>>;

  return {
    ...(typeof source.postReplies === "boolean" ? { postReplies: source.postReplies } : {}),
    ...(typeof source.directReplies === "boolean" ? { directReplies: source.directReplies } : {}),
    ...(typeof source.followedPostReplies === "boolean"
      ? { followedPostReplies: source.followedPostReplies }
      : {}),
    ...(typeof source.followedAuthorPosts === "boolean"
      ? { followedAuthorPosts: source.followedAuthorPosts }
      : {}),
    ...(typeof source.systemMessages === "boolean"
      ? { systemMessages: source.systemMessages }
      : {}),
  };
}

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Нужно войти в аккаунт." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    preferences: await getNotificationPreferences(currentUser.id),
  });
}

export async function PATCH(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Нужно войти в аккаунт." },
      { status: 401 },
    );
  }

  const payload = await request.json().catch(() => null);
  const preferences = await updateNotificationPreferences(
    currentUser.id,
    readPreferencePatch(payload),
  );

  return NextResponse.json({
    ok: true,
    preferences,
  });
}
