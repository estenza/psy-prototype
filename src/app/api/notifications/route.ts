import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import {
  getNotificationsOverview,
  markViewerNotificationsRead,
} from "@/features/notifications/lib/notifications-service";
import { buildNotificationsErrorResponse } from "@/features/notifications/lib/notifications-http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Нужно войти в аккаунт." },
        { status: 401 },
      );
    }

    const { notifications, unreadCount } = await getNotificationsOverview(currentUser);

    return NextResponse.json(
      {
        notifications,
        unreadCount,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return buildNotificationsErrorResponse(error, "Не удалось загрузить уведомления.");
  }
}

export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Нужно войти в аккаунт." },
        { status: 401 },
      );
    }

    const { unreadCount } = await markViewerNotificationsRead(currentUser);

    return NextResponse.json({
      ok: true,
      unreadCount,
    });
  } catch (error) {
    return buildNotificationsErrorResponse(error);
  }
}
