"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ContentPlaceholder } from "@/components/ui/content-placeholder";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import type { UserNotification } from "@/features/auth/types";
import { formatNotificationTime } from "@/features/notifications/lib/notification-time";

type NotificationsPageContentProps = {
  initialNotifications: UserNotification[];
  initialUnreadCount: number;
};

export function NotificationsPageContent({
  initialNotifications,
  initialUnreadCount,
}: NotificationsPageContentProps) {
  const notifications = initialUnreadCount > 0
    ? initialNotifications.map((notification) => ({
      ...notification,
      isRead: true,
    }))
    : initialNotifications;

  useEffect(() => {
    if (initialUnreadCount <= 0) {
      return;
    }

    void fetch("/api/notifications", {
      method: "POST",
    }).catch(() => undefined);
  }, [initialUnreadCount]);

  if (notifications.length === 0) {
    return (
      <ContentPlaceholder
        title="Пока нет уведомлений"
        description="Ответы, подписки и важные сообщения появятся здесь."
      />
    );
  }

  return (
    <section
      aria-label="Уведомления"
      className="surface-elevated flex w-full min-w-0 flex-col overflow-hidden rounded-[28px]"
    >
      {notifications.map((notification) => (
        <Link
          key={notification.id}
          href={notification.href}
          className="flex min-w-0 gap-3 border-b border-[var(--separator)] px-1 py-4 text-left transition-colors hover:bg-[var(--fill-quaternary)]"
        >
          <UserAvatar
            avatarUrl={notification.actorAvatarUrl}
            name={notification.actorName ?? "внутри"}
            size="sm"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold leading-5 text-[var(--label-primary)]">
              {notification.title}
            </span>
            {notification.body ? (
              <span className="mt-0.5 block truncate text-[13px] leading-5 text-[var(--label-secondary)]">
                {notification.body}
              </span>
            ) : null}
            <span className="mt-1 block text-[12px] leading-4 text-[var(--label-tertiary)]">
              {formatNotificationTime(notification.createdAt)}
            </span>
          </span>
        </Link>
      ))}
    </section>
  );
}
