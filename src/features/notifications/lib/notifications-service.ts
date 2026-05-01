import "server-only";

import {
  countUnreadNotifications,
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  updateNotificationPreferences,
} from "@/features/notifications/lib/notifications-repository";
import type { NotificationPreferences, SessionUser } from "@/features/auth/types";

export class NotificationsServiceError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "NotificationsServiceError";
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function toServiceError(error: unknown) {
  if (error instanceof NotificationsServiceError) {
    return error;
  }

  console.error("[notifications-service]", error);
  return new NotificationsServiceError("Внутренняя ошибка уведомлений.", 500);
}

export async function getNotificationsOverview(viewer: SessionUser) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      listNotifications(viewer.id),
      countUnreadNotifications(viewer.id),
    ]);

    return {
      notifications,
      unreadCount,
    };
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function markViewerNotificationsRead(viewer: SessionUser) {
  try {
    await markAllNotificationsRead(viewer.id);

    return {
      unreadCount: 0,
    };
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function getViewerNotificationPreferences(viewer: SessionUser) {
  try {
    return await getNotificationPreferences(viewer.id);
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function updateViewerNotificationPreferences(
  viewer: SessionUser,
  preferences: Partial<NotificationPreferences>,
) {
  try {
    return await updateNotificationPreferences(viewer.id, preferences);
  } catch (error) {
    throw toServiceError(error);
  }
}
