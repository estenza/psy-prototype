import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import {
  getViewerNotificationPreferences,
  updateViewerNotificationPreferences,
} from "@/features/notifications/lib/notifications-service";
import { buildNotificationsErrorResponse } from "@/features/notifications/lib/notifications-http";
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
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Нужно войти в аккаунт." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      preferences: await getViewerNotificationPreferences(currentUser),
    });
  } catch (error) {
    return buildNotificationsErrorResponse(
      error,
      "Не удалось загрузить настройки уведомлений.",
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Нужно войти в аккаунт." },
        { status: 401 },
      );
    }

    const payload = await request.json().catch(() => null);
    const preferences = await updateViewerNotificationPreferences(
      currentUser,
      readPreferencePatch(payload),
    );

    return NextResponse.json({
      ok: true,
      preferences,
    });
  } catch (error) {
    return buildNotificationsErrorResponse(
      error,
      "Не удалось сохранить настройки уведомлений.",
    );
  }
}
