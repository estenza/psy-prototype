"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Fragment } from "react";
import type { MouseEvent } from "react";
import type { ReactNode } from "react";
import { NavIcon, NotificationIcon, PlusCircleIcon } from "@/components/ui/icons";
import { AppBrand, AppBrandCompact } from "@/components/layout/app-brand";
import { buttonClassName } from "@/components/ui/button-styles";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { isNavigationItemCurrent } from "@/constants/navigation";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { buildCreateTopicHref } from "@/features/topic-creation/lib/create-topic-navigation";
import type { NavigationItem, NavigationItemKey } from "@/types/navigation";

type MenuColumnProps = {
  items: readonly NavigationItem[];
  activeSection: NavigationItemKey | null;
  hideContent?: boolean;
  customContent?: ReactNode;
};

export function MenuColumn({
  items,
  activeSection,
  hideContent = false,
  customContent,
}: MenuColumnProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openAuthModal, user } = useAuthClient();
  const currentSearch = searchParams.toString();
  const currentPathWithSearch = pathname
    ? `${pathname}${currentSearch ? `?${currentSearch}` : ""}`
    : "/";
  const createTopicHref = buildCreateTopicHref(currentPathWithSearch);
  const isCreateTopicActive = pathname === "/create-topic";
  const isNotificationsActive = pathname === "/notifications";
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const visibleUnreadNotificationCount =
    user && !isNotificationsActive ? unreadNotificationCount : 0;
  const menuItemBaseClassName =
    "app-menu-item h-14 min-h-14 w-14 min-w-14 justify-center gap-0 rounded-[999px] px-0 py-0 text-[20px] min-[1296px]:h-auto min-[1296px]:min-h-0 min-[1296px]:w-full min-[1296px]:min-w-0 min-[1296px]:justify-start min-[1296px]:gap-4 min-[1296px]:py-3 min-[1296px]:pl-4 min-[1296px]:pr-8";
  const leadingItems = items.filter((item) => (
    item.key !== "profile" && item.key !== "settings" && item.key !== "drafts"
  ));
  const profileItem = items.find((item) => item.key === "profile") ?? null;
  const settingsItem = items.find((item) => item.key === "settings") ?? null;
  const customInnerWidthClassName = customContent
    ? "w-[248px]"
    : "w-[calc(var(--app-shell-nav-compact-width)+16px)] min-[1296px]:w-[calc(var(--app-shell-nav-width)+24px)]";
  const customRailWidthClassName = customContent
    ? "w-[224px] min-w-[224px]"
    : "w-[calc(var(--app-shell-nav-compact-width)+16px)] min-w-[calc(var(--app-shell-nav-compact-width)+16px)] min-[1296px]:w-[var(--app-shell-nav-width)] min-[1296px]:min-w-[var(--app-shell-nav-width)]";
  const columnWidthClassName = customContent
    ? "min-[481px]:w-[248px]"
    : "min-[481px]:w-[max(calc(var(--app-shell-nav-compact-width)+16px),calc((100vw-var(--app-shell-primary-column-width))/2))] min-[1140px]:w-auto min-[1140px]:grow min-[1140px]:basis-auto";

  function handleItemClick(
    event: MouseEvent<HTMLAnchorElement>,
    item: NavigationItem,
  ) {
    if (item.requiresAuth && !user) {
      event.preventDefault();
      openAuthModal({ nextHref: item.href });
      return;
    }

    if (!isNavigationItemCurrent(pathname, item)) {
      return;
    }

    event.preventDefault();
    router.refresh();
  }

  const loadUnreadNotificationCount = useCallback(async () => {
    if (!user) {
      setUnreadNotificationCount(0);
      return;
    }

    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json() as { unreadCount?: number };
      setUnreadNotificationCount(payload.unreadCount ?? 0);
    } catch {
      // Keep the last known count when polling fails.
    }
  }, [user]);

  useEffect(() => {
    if (!user || isNotificationsActive) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadUnreadNotificationCount();
    }, 0);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadUnreadNotificationCount();
      }
    }, 30_000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [isNotificationsActive, loadUnreadNotificationCount, user]);

  function renderNavigationItem(item: NavigationItem) {
    return (
      <HoverTooltip
        key={item.name}
        label={item.name}
        placement="right"
        contentClassName="min-[1296px]:hidden"
        triggerClassName="flex w-full justify-center min-[1296px]:block"
      >
        <Link
          href={item.href}
          onClick={(event) => handleItemClick(event, item)}
          aria-label={item.name}
          className={buttonClassName({
            className: `${menuItemBaseClassName} ${
              item.key === activeSection
                ? "app-menu-item--active font-semibold text-[var(--label-primary)]"
                : "app-menu-item--inactive font-normal text-[var(--label-tertiary)]"
            }`,
            size: "lg",
            variant: "tertiary",
          })}
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full">
            {item.key === "profile" && user ? (
              <>
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  name={user.displayName || user.email}
                  size="menu"
                />
                {item.key === activeSection ? (
                  <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_2px_var(--label-primary)]" />
                ) : null}
              </>
            ) : (
              <NavIcon name={item.key} filled={item.key === activeSection} />
            )}
          </span>
          <span className="hidden min-[1296px]:inline">{item.name}</span>
        </Link>
      </HoverTooltip>
    );
  }

  function renderNotificationsItem() {
    if (!user) {
      return null;
    }

    return (
      <HoverTooltip
        key="notifications"
        label="Уведомления"
        placement="right"
        contentClassName="min-[1296px]:hidden"
        triggerClassName="flex w-full justify-center min-[1296px]:block"
      >
        <Link
          href="/notifications"
          aria-label="Уведомления"
          onClick={(event) => {
            if (isNotificationsActive) {
              event.preventDefault();
              router.refresh();
              return;
            }

            setUnreadNotificationCount(0);
          }}
          className={buttonClassName({
            className: `${menuItemBaseClassName} ${
              isNotificationsActive
                ? "app-menu-item--active font-semibold text-[var(--label-primary)]"
                : "app-menu-item--inactive font-normal text-[var(--label-tertiary)]"
            }`,
            size: "lg",
            variant: "tertiary",
          })}
        >
          <span className="relative flex h-8 w-8 items-center justify-center">
            <NotificationIcon filled={isNotificationsActive} />
            {visibleUnreadNotificationCount > 0 ? (
              <span className="pointer-events-none absolute right-0 top-0 min-h-[16px] min-w-[16px] rounded-full bg-[var(--accent-primary)] px-1 text-center text-[10px] font-semibold leading-4 text-white">
                {visibleUnreadNotificationCount > 99 ? "99+" : visibleUnreadNotificationCount}
              </span>
            ) : null}
          </span>
          <span className="hidden min-[1296px]:inline">Уведомления</span>
        </Link>
      </HoverTooltip>
    );
  }

  function renderCreateTopicItem() {
    return (
      <HoverTooltip
        key="create-topic"
        label="Написать"
        placement="right"
        contentClassName="min-[1296px]:hidden"
        triggerClassName="flex w-full justify-center min-[1296px]:block"
      >
        <Link
          href={createTopicHref}
          aria-label="Написать"
          className={buttonClassName({
            className: `${menuItemBaseClassName} ${
              isCreateTopicActive
                ? "app-menu-item--active font-semibold text-[var(--label-primary)]"
                : "app-menu-item--inactive font-normal text-[var(--label-tertiary)]"
            }`,
            size: "lg",
            variant: "tertiary",
          })}
        >
          <span className="flex h-8 w-8 items-center justify-center">
            <PlusCircleIcon />
          </span>
          <span className="hidden min-[1296px]:inline">Написать</span>
        </Link>
      </HoverTooltip>
    );
  }

  return (
    <div
      data-testid="menuColumn"
      className={`hidden min-[481px]:relative min-[481px]:z-[3] min-[481px]:flex min-[481px]:h-full min-[481px]:min-w-0 min-[481px]:shrink-0 min-[481px]:flex-col min-[481px]:items-start min-[1296px]:items-end ${columnWidthClassName}`.trim()}
    >
      <div
        data-testid="menuColumnInner"
        className={`flex min-w-0 min-[481px]:h-full ${customInnerWidthClassName} items-stretch justify-start pl-0 pr-0 transition-[width] duration-200 ease-out min-[1296px]:justify-end min-[1296px]:pl-2 min-[1296px]:pr-4`.trim()}
      >
        <aside
          className={`relative z-10 min-[481px]:h-full ${customRailWidthClassName} ${
            hideContent ? "pointer-events-none invisible" : ""
          }`.trim()}
          aria-hidden={hideContent}
        >
          {customContent ? (
            <div
              data-testid="menuRailCustom"
              className={`flex min-[481px]:h-full ${customRailWidthClassName} flex-col items-stretch overflow-hidden px-0 pb-4 pt-[92px]`.trim()}
            >
              {customContent}
            </div>
          ) : (
            <nav
              aria-label="Основная навигация"
              data-testid="menuRail"
              className="surface-primary border-separator flex min-[481px]:h-full w-[calc(var(--app-shell-nav-compact-width)+16px)] min-[1296px]:w-[var(--app-shell-nav-width)] flex-col items-stretch gap-0 overflow-visible px-0 pb-4 pt-6"
            >
              <Link
                href="/"
                aria-label="внутри"
                className="mb-8 inline-flex max-w-none cursor-pointer justify-center min-[1296px]:justify-start min-[1296px]:px-4"
              >
                <AppBrandCompact
                  className="menu-column-logo-compact"
                  markClassName="h-8 w-8 shrink-0"
                />
                <AppBrand
                  className="menu-column-logo-full"
                  wordmarkClassName="h-8 w-auto shrink-0"
                  labelClassName="h-5 w-auto shrink-0"
                />
              </Link>

              {leadingItems.map((item) => (
                <Fragment key={item.key}>
                  {renderNavigationItem(item)}
                  {item.key === "bookmarks" ? renderNotificationsItem() : null}
                </Fragment>
              ))}
              {profileItem ? renderNavigationItem(profileItem) : null}
              {renderCreateTopicItem()}
              {settingsItem ? renderNavigationItem(settingsItem) : null}
            </nav>
          )}
        </aside>
      </div>
    </div>
  );
}
