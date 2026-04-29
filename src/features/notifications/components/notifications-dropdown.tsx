"use client";

import { Badge, Dropdown } from "@heroui/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { DropdownPopover } from "@/components/ui/dropdown-popover";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { NotificationIcon } from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button-styles";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import type { UserNotification } from "@/features/auth/types";
import { formatNotificationTime } from "@/features/notifications/lib/notification-time";

type NotificationsResponse = {
  notifications: UserNotification[];
  unreadCount: number;
};

const circularControlClassName =
  buttonClassName({
    className:
      "button--icon-only relative h-10 w-10 flex-none px-0 text-[var(--label-primary)]",
    size: "lg",
    variant: "tertiary",
  });

export function NotificationsDropdown({
  anchorClassName = "relative flex-none",
  triggerLabel,
  triggerClassName,
  tooltipTriggerClassName,
  triggerIconClassName = "flex h-5 w-5 flex-none items-center justify-center",
}: {
  anchorClassName?: string;
  triggerLabel?: ReactNode;
  triggerClassName?: string;
  tooltipTriggerClassName?: string;
  triggerIconClassName?: string;
} = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json() as NotificationsResponse;
      setNotifications(payload.notifications);
      setUnreadCount(payload.unreadCount);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setUnreadCount(0);
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        isRead: true,
      })),
    );

    await fetch("/api/notifications", {
      method: "POST",
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    void loadNotifications();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible" && !isOpen) {
        void loadNotifications();
      }
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isOpen, loadNotifications]);

  function handleOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    void loadNotifications().then(() => {
      void markAllRead();
    });
  }

  return (
    <Dropdown.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Badge.Anchor className={anchorClassName}>
        <HoverTooltip
          label="Уведомления"
          isDisabled={isOpen}
          triggerClassName={tooltipTriggerClassName}
        >
          <Dropdown.Trigger
            aria-label="Уведомления"
            className={`${triggerClassName ?? circularControlClassName} overflow-visible`.trim()}
          >
            <span className={triggerIconClassName}>
              <NotificationIcon />
            </span>
            {triggerLabel}
          </Dropdown.Trigger>
        </HoverTooltip>
        {unreadCount > 0 ? (
          <Badge
            size="sm"
            variant="primary"
            className="pointer-events-none absolute top-2 right-2 min-h-[18px] min-w-[18px] select-none border-0 bg-[var(--accent-primary)] px-1 text-[11px] font-semibold leading-none text-white shadow-none"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        ) : null}
      </Badge.Anchor>

      <DropdownPopover placement="bottom end" className="w-[min(380px,calc(100vw-24px))] overflow-hidden p-0">
        <section aria-label="Уведомления" className="max-h-[min(560px,calc(100svh-96px))] overflow-y-auto">
          <header className="sticky top-0 z-10 surface-elevated border-b border-[var(--separator)] px-4 py-3">
            <h2 className="text-[16px] font-semibold text-[var(--label-primary)]">
              Уведомления
            </h2>
          </header>

          {notifications.length > 0 ? (
            <div className="divide-y divide-[var(--separator)]">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  className={`flex min-w-0 gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--fill-quaternary)] ${
                    notification.isRead ? "" : "bg-[var(--color-accent-soft)]"
                  }`.trim()}
                  onClick={() => setIsOpen(false)}
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
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-[14px] font-medium text-[var(--label-primary)]">
                Пока нет уведомлений
              </p>
              <p className="mt-1 text-[13px] leading-5 text-[var(--label-secondary)]">
                Ответы, подписки и важные сообщения появятся здесь.
              </p>
            </div>
          )}

          {isLoading && notifications.length === 0 ? (
            <div className="px-4 pb-4 text-center text-[13px] text-[var(--label-tertiary)]">
              Загружаем...
            </div>
          ) : null}
        </section>
      </DropdownPopover>
    </Dropdown.Root>
  );
}
