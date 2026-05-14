"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  compactWidth?: "default" | "narrow";
  hideContent?: boolean;
  customContent?: ReactNode;
};

export function MenuColumn({
  items,
  activeSection,
  compactWidth = "default",
  hideContent = false,
  customContent,
}: MenuColumnProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const visibleItems = items.filter((item) => (
    (!item.guestOnly || !user) && (item.key !== "settings" || user)
  ));
  const menuItemBaseClassName =
    "app-menu-item w-14 min-w-14 justify-center gap-0 rounded-[1000px] min-[1296px]:w-full min-[1296px]:min-w-0 min-[1296px]:justify-start min-[1296px]:gap-4";
  const leadingItems = visibleItems.filter((item) => (
    item.key !== "profile"
    && item.key !== "settings"
    && item.key !== "drafts"
    && item.key !== "for-psychologists"
  ));
  const profileItem = visibleItems.find((item) => item.key === "profile") ?? null;
  const settingsItem = visibleItems.find((item) => item.key === "settings") ?? null;
  const psychologistsEntryItem = visibleItems.find((item) => item.key === "for-psychologists") ?? null;
  const customInnerWidthClassName = customContent
    ? "w-[248px]"
    : "w-[calc(var(--app-shell-nav-compact-width)+16px)] min-[1296px]:w-[calc(var(--app-shell-nav-width)+24px)]";
  const customRailWidthClassName = customContent
    ? "w-[224px] min-w-[224px]"
    : "w-[calc(var(--app-shell-nav-compact-width)+16px)] min-w-[calc(var(--app-shell-nav-compact-width)+16px)] min-[1296px]:w-[var(--app-shell-nav-width)] min-[1296px]:min-w-[var(--app-shell-nav-width)]";
  const compactColumnWidthClassName = compactWidth === "narrow"
    ? "min-[480px]:w-[calc(var(--app-shell-nav-compact-width)+16px)] min-[1296px]:w-auto min-[1296px]:grow min-[1296px]:basis-auto"
    : "min-[480px]:w-[max(calc(var(--app-shell-nav-compact-width)+16px),calc((100vw-var(--app-shell-primary-column-width))/2))] min-[1140px]:w-auto min-[1140px]:grow min-[1140px]:basis-auto";
  const columnWidthClassName = customContent
    ? "min-[480px]:w-[248px]"
    : compactColumnWidthClassName;

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
            variant: "quaternary",
          })}
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full">
            {item.key === "profile" && user ? (
              <>
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  avatarSeed={user.nickname || user.id}
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
          <span className="hidden min-w-0 truncate min-[1296px]:inline">{item.name}</span>
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
            variant: "quaternary",
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
            variant: "quaternary",
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
      className={`hidden min-[480px]:relative min-[480px]:z-[3] min-[480px]:flex min-[480px]:h-full min-[480px]:min-w-0 min-[480px]:shrink-0 min-[480px]:flex-col min-[480px]:items-start min-[1296px]:items-end ${columnWidthClassName}`.trim()}
    >
      <div
        data-testid="menuColumnInner"
        className={`flex min-w-0 min-[480px]:h-full ${customInnerWidthClassName} items-stretch justify-start pl-0 pr-0 transition-[width] duration-200 ease-out min-[1296px]:justify-end min-[1296px]:pl-2 min-[1296px]:pr-4`.trim()}
      >
        <aside
          className={`relative z-10 min-[480px]:sticky min-[480px]:top-0 min-[480px]:h-dvh min-[480px]:self-start ${customRailWidthClassName} ${
            hideContent ? "pointer-events-none invisible" : ""
          }`.trim()}
          aria-hidden={hideContent}
        >
          {customContent ? (
            <div
              data-testid="menuRailCustom"
              className={`flex min-[480px]:h-full ${customRailWidthClassName} flex-col items-stretch overflow-hidden px-0 pb-4 pt-[92px]`.trim()}
            >
              {customContent}
            </div>
          ) : (
            <nav
              aria-label="Основная навигация"
              data-testid="menuRail"
              className="surface-primary border-separator flex min-[480px]:h-full w-[calc(var(--app-shell-nav-compact-width)+16px)] min-[1296px]:w-[var(--app-shell-nav-width)] flex-col items-stretch gap-0 overflow-visible px-0 pb-4 pt-6"
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

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-0">
                  {leadingItems.map((item) => (
                    <Fragment key={item.key}>
                      {renderNavigationItem(item)}
                      {item.key === "bookmarks" ? renderNotificationsItem() : null}
                    </Fragment>
                  ))}
                  {profileItem ? renderNavigationItem(profileItem) : null}
                  {settingsItem ? renderNavigationItem(settingsItem) : null}
                  {psychologistsEntryItem ? renderNavigationItem(psychologistsEntryItem) : null}
                </div>
                {renderCreateTopicItem()}
              </div>
            </nav>
          )}
        </aside>
      </div>
    </div>
  );
}
