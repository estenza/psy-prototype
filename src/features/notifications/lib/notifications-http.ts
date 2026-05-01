import { NextResponse } from "next/server";
import { NotificationsServiceError } from "@/features/notifications/lib/notifications-service";

export function buildNotificationsErrorResponse(
  error: unknown,
  fallbackMessage = "Не удалось обновить уведомления.",
) {
  if (error instanceof NotificationsServiceError) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  console.error("[api/notifications]", error);

  return NextResponse.json(
    {
      error: fallbackMessage,
    },
    {
      status: 500,
    },
  );
}
