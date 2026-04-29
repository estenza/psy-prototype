import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
} from "@/features/notifications/lib/notifications-repository";

export const runtime = "nodejs";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Нужно войти в аккаунт." },
      { status: 401 },
    );
  }

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(currentUser.id),
    countUnreadNotifications(currentUser.id),
  ]);

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
}

export async function POST() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Нужно войти в аккаунт." },
      { status: 401 },
    );
  }

  await markAllNotificationsRead(currentUser.id);

  return NextResponse.json({
    ok: true,
    unreadCount: 0,
  });
}
