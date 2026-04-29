"use client";

import { SearchField as HeroSearchField } from "@heroui/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  NavIcon,
  NotificationIcon,
  PlusCircleIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button-styles";
import {
  DEFAULT_ACTIVE_SECTION,
  isNavigationItemCurrent,
  navItems,
} from "@/constants/navigation";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { AuthStatus } from "@/features/auth/components/auth-status";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { AppBrand } from "@/components/layout/app-brand";
import { LegalInfo } from "@/components/layout/legal-info";
import { buildOwnProfilePath } from "@/features/auth/lib/profile";
import { buildCreateTopicHref } from "@/features/topic-creation/lib/create-topic-navigation";
import type { NavigationItem, NavigationItemKey } from "@/types/navigation";

type AppHeaderProps = {
  adminMode?: boolean;
  showCreateAction?: boolean;
  showSearch?: boolean;
};

const desktopHeaderSearchInputId = "app-header-search-input-desktop";

type CreateTopicButtonProps = {
  ariaLabel?: string;
  children?: ReactNode;
  className: string;
  href: string;
  iconOnly?: boolean;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  variant?: "secondary" | "tertiary";
};

function CreateTopicButton({
  ariaLabel = "Написать",
  children,
  className,
  href,
  iconOnly = false,
  onClick,
  variant = "tertiary",
}: CreateTopicButtonProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={ariaLabel}
      className={buttonClassName({
        className: `flex-none gap-2 whitespace-nowrap ${className}`.trim(),
        variant,
      })}
    >
      <span className="flex h-5 w-5 flex-none items-center justify-center">
        <PlusCircleIcon />
      </span>
      {!iconOnly ? (
        <span className="whitespace-nowrap">{children ?? "Написать"}</span>
      ) : null}
    </Link>
  );
}

type MobileTabItem = {
  href: string;
  key: "create" | "home" | "notifications" | "search";
  label: string;
  requiresAuth?: boolean;
};

function getMobileTabClassName(isActive: boolean) {
  return `flex min-w-0 flex-1 items-center justify-center rounded-[18px] px-1 py-2 transition-colors ${
    isActive
      ? "text-[var(--accent-primary)]"
      : "text-[var(--label-tertiary)]"
  }`.trim();
}

function MobileTabBar({
  createTopicHref,
  onRequireAuth,
  pathname,
  router,
  user,
}: {
  createTopicHref: string;
  onRequireAuth: (nextHref?: string) => void;
  pathname: string | null;
  router: ReturnType<typeof useRouter>;
  user: ReturnType<typeof useAuthClient>["user"];
}) {
  const items: MobileTabItem[] = [
    { key: "home", label: "Главная", href: "/" },
    { key: "search", label: "Поиск", href: "/search" },
    { key: "create", label: "Написать", href: createTopicHref },
    { key: "notifications", label: "Уведомления", href: "/notifications", requiresAuth: true },
  ];

  function isTabActive(item: MobileTabItem) {
    if (item.key === "home") {
      return pathname === "/";
    }

    if (item.key === "create") {
      return pathname === "/create-topic";
    }

    if (item.key === "notifications") {
      return pathname === "/notifications";
    }

    return pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);
  }

  function handleTabClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    item: MobileTabItem,
  ) {
    if (item.requiresAuth && !user) {
      event.preventDefault();
      onRequireAuth(item.href);
      return;
    }

    if (isTabActive(item)) {
      event.preventDefault();
      router.refresh();
    }
  }

  return (
    <nav
      aria-label="Основная навигация"
      className="surface-elevated fixed inset-x-0 bottom-0 z-[80] flex min-[481px]:hidden border-t border-[var(--separator)] px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-1.5"
    >
      {items.map((item) => {
        const isActive = isTabActive(item);

        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={(event) => handleTabClick(event, item)}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            className={getMobileTabClassName(isActive)}
          >
            <span className="flex h-8 w-8 items-center justify-center">
              {item.key === "home" ? (
                <NavIcon name="forum" filled={isActive} />
              ) : item.key === "search" ? (
                <SearchIcon />
              ) : item.key === "create" ? (
                <PlusCircleIcon />
              ) : (
                <NotificationIcon filled={isActive} />
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function getMobilePanelItemClassName(isActive = false) {
  return buttonClassName({
    className: `app-menu-item min-h-14 h-auto w-full justify-start gap-3 px-4 py-3 text-left text-[16px] ${
      isActive
        ? "app-menu-item--active font-semibold text-[var(--label-primary)]"
        : "app-menu-item--inactive font-medium text-[var(--label-tertiary)]"
    }`,
    size: "lg",
    variant: "tertiary",
  });
}

function resolveActiveSection(pathname: string | null, profileHref: string): NavigationItemKey {
  if (pathname === profileHref) {
    return "profile";
  }

  const matchedItem = navItems.find((item) => isNavigationItemCurrent(pathname, item));

  return matchedItem?.key ?? DEFAULT_ACTIVE_SECTION;
}

export function AppHeader({
  adminMode = false,
  showCreateAction = true,
  showSearch = true,
}: AppHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openAuthModal, user } = useAuthClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAdminHeader = adminMode;
  const homeHref = isAdminHeader ? "/admin/users" : "/";
  const currentSearch = searchParams.toString();
  const currentPathWithSearch = pathname
    ? `${pathname}${currentSearch ? `?${currentSearch}` : ""}`
    : "/";
  const createTopicHref = buildCreateTopicHref(currentPathWithSearch);
  const profileHref = user ? (buildOwnProfilePath(user) ?? "/profile") : "/profile";
  const activeSection = resolveActiveSection(pathname, profileHref);
  const shouldShowSearch = showSearch && !isAdminHeader;
  const mobileMenuItems = navItems.filter((item) => (
    item.key !== "forum" && item.key !== "drafts"
  ));

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 481px)");

    function handleMediaQueryChange(event: MediaQueryListEvent) {
      if (event.matches) {
        setIsMobileMenuOpen(false);
      }
    }

    mediaQuery.addEventListener("change", handleMediaQueryChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  function getMobileMenuItemHref(item: NavigationItem) {
    return item.key === "profile" ? profileHref : item.href;
  }

  function isMobileMenuItemActive(item: NavigationItem) {
    if (item.key === "profile") {
      return pathname === "/profile" || pathname === profileHref;
    }

    return isNavigationItemCurrent(pathname, item);
  }

  function handleMobileMenuItemClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    item: NavigationItem,
  ) {
    const href = getMobileMenuItemHref(item);

    if (item.requiresAuth && !user) {
      event.preventDefault();
      setIsMobileMenuOpen(false);
      openAuthModal({ nextHref: href });
      return;
    }

    setIsMobileMenuOpen(false);

    if (!isMobileMenuItemActive(item)) {
      return;
    }

    event.preventDefault();
    router.refresh();
  }

  function handleSearchGroupPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('[data-slot="search-field-clear-button"], [slot="clear"]')) {
      return;
    }

    const input = event.currentTarget.querySelector('input');

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    if (document.activeElement !== input) {
      event.preventDefault();
      input.focus();

      const valueLength = input.value.length;

      try {
        input.setSelectionRange(valueLength, valueLength);
      } catch {
        // Some browsers may disallow manual caret placement for search inputs.
      }
    }
  }

  return (
    <header className={`surface-elevated relative z-50 shadow-[0_2px_12px_rgba(17,24,39,0.06)] ${
      isAdminHeader
        ? "fixed inset-x-0 top-0"
        : "min-[481px]:hidden"
    }`.trim()}>
      {isAdminHeader ? (
        <div className="relative z-10 mx-auto grid w-full max-w-[var(--app-shell-max-width)] min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-[calc(var(--space-4)+16px)] py-3 min-[1280px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[1280px]:px-[var(--app-shell-desktop-side-offset)]">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={homeHref}
              aria-label="внутри"
              className="inline-flex w-fit max-w-full cursor-pointer"
            >
              <AppBrand
                showAdminLabel={isAdminHeader}
                wordmarkClassName="h-7 w-auto shrink-0"
                labelClassName="h-[18px] w-auto shrink-0"
              />
            </Link>
          </div>

          <div className="flex w-fit max-w-full min-w-0 items-center justify-end justify-self-end">
            <div className="flex min-w-0 items-center gap-0">
              {showCreateAction ? (
                <CreateTopicButton
                  className="h-10 px-3 text-[13px] min-[481px]:h-11 min-[481px]:px-4 min-[481px]:text-sm"
                  href={createTopicHref}
                >
                  Написать
                </CreateTopicButton>
              ) : null}
            </div>

            <div className={`${showCreateAction ? "ml-4" : ""} flex flex-none items-center`.trim()}>
              <AuthStatus compact />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-10 mx-auto grid w-full max-w-[var(--app-shell-max-width)] grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-x-2 px-3 py-3 min-[481px]:hidden">
            <button
              type="button"
              aria-expanded={isMobileMenuOpen}
              aria-haspopup="dialog"
              aria-controls="app-mobile-navigation"
              aria-label={isMobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
              onClick={() => setIsMobileMenuOpen((currentState) => !currentState)}
              className={buttonClassName({
                className:
                  "button--icon-only relative h-11 w-11 justify-self-start px-0 text-[var(--label-primary)]",
                size: "lg",
                variant: "tertiary",
              })}
            >
              {user ? (
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  name={user.displayName || user.email}
                  size="menu"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center">
                  <NavIcon name="profile" />
                </span>
              )}
            </button>

            <Link
              href={homeHref}
              aria-label="внутри"
              className="inline-flex w-fit max-w-full cursor-pointer justify-self-center"
            >
              <AppBrand
                wordmarkClassName="h-7 w-auto shrink-0"
                labelClassName="h-[18px] w-auto shrink-0"
              />
            </Link>

            <div aria-hidden="true" />
          </div>

          <div className="relative z-10 hidden w-full min-w-0 min-[481px]:flex min-[481px]:h-[var(--app-header-height)] min-[481px]:overflow-x-clip min-[481px]:overflow-y-visible">
            <div className="relative z-[3] flex h-full min-w-0 shrink-0 flex-col items-start min-[481px]:w-[max(calc(var(--app-shell-nav-compact-width)+24px),calc((100vw-var(--app-shell-primary-column-width))/2))] min-[1140px]:w-auto min-[1140px]:grow min-[1140px]:basis-auto min-[1296px]:items-end">
              <div className="flex h-full min-w-0 w-[calc(var(--app-shell-desktop-side-offset)+var(--app-shell-nav-compact-width))] items-stretch justify-start pl-[var(--app-shell-desktop-side-offset)] pr-0 transition-[width] duration-200 ease-out min-[1296px]:w-[calc(var(--app-shell-nav-width)+24px)] min-[1296px]:justify-end min-[1296px]:pl-2 min-[1296px]:pr-4">
                <aside className="relative z-10 h-full w-[var(--app-shell-nav-compact-width)] min-w-[var(--app-shell-nav-compact-width)] min-[1296px]:w-[var(--app-shell-nav-width)] min-[1296px]:min-w-[var(--app-shell-nav-width)]">
                  <div className="flex h-full w-full items-center">
                    <Link
                      href={homeHref}
                      aria-label="внутри"
                      className="inline-flex w-fit max-w-full cursor-pointer min-[481px]:max-w-[var(--app-shell-side-rail-width)]"
                    >
                      <AppBrand
                        wordmarkClassName="h-8 w-auto shrink-0"
                        labelClassName="h-5 w-auto shrink-0"
                      />
                    </Link>
                  </div>
                </aside>
              </div>
            </div>

            <main className="flex min-h-full min-w-0 grow basis-auto flex-shrink flex-col items-start overflow-x-clip overflow-y-visible">
              <div className="flex min-w-0 w-full flex-1 flex-col min-[1140px]:min-w-[var(--app-shell-main-width)] min-[1140px]:w-fit">
                <div className="flex w-full min-w-0 flex-1">
                  <div className="min-w-0 w-full min-[1140px]:flex min-[1140px]:flex-row min-[1140px]:items-center min-[1140px]:gap-[var(--app-shell-column-gap)]">
                    <div className="flex h-full min-w-0 w-full max-w-[672px] shrink-0 items-center px-4">
                      {shouldShowSearch ? (
                        <HeroSearchField
                          aria-label="Поиск по историям, темам, психологам"
                          className="min-w-0 w-full overflow-visible border-0 bg-transparent p-0 shadow-none outline-none ring-0 focus-within:border-0 focus-within:shadow-none focus-within:outline-none"
                          fullWidth
                        >
                          <HeroSearchField.Group
                            className="app-header-search-group h-11 min-h-11 w-full"
                            onPointerDown={handleSearchGroupPointerDown}
                          >
                            <HeroSearchField.SearchIcon />
                            <HeroSearchField.Input
                              id={desktopHeaderSearchInputId}
                              aria-label="Поиск по историям, темам, психологам"
                              placeholder="Поиск по историям, темам, психологам"
                              suppressHydrationWarning
                              className="!text-[14px] !leading-5"
                            />
                            <HeroSearchField.ClearButton aria-label="Очистить поиск" />
                          </HeroSearchField.Group>
                        </HeroSearchField>
                      ) : null}
                    </div>

                    <aside className="hidden h-full shrink-0 min-[1140px]:flex min-[1140px]:w-[var(--app-shell-sidebar-column-width)] min-[1140px]:min-w-[var(--app-shell-sidebar-column-width)] min-[1140px]:max-w-[var(--app-shell-sidebar-column-width)]">
                      <div className="flex h-full w-full items-center justify-end px-6 xl:px-8">
                        <div className="flex min-w-0 items-center gap-0">
                          {showCreateAction ? (
                            <CreateTopicButton
                              className="h-11 px-4 text-sm"
                              href={createTopicHref}
                            >
                              Написать
                            </CreateTopicButton>
                          ) : null}
                        </div>

                        <div className={`${showCreateAction ? "ml-4" : ""} flex flex-none items-center`.trim()}>
                          <AuthStatus compact />
                        </div>
                      </div>
                    </aside>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </>
      )}

      {!isAdminHeader ? (
        <div
          className={`fixed inset-0 z-[120] min-[481px]:hidden ${
            isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
          aria-hidden={!isMobileMenuOpen}
        >
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`absolute inset-0 bg-[var(--backdrop)] transition-opacity duration-300 ease-out ${
              isMobileMenuOpen ? "opacity-100" : "opacity-0"
            }`}
          />

          <aside
            id="app-mobile-navigation"
            aria-label="Разделы"
            className={`surface-elevated border-separator relative flex h-full w-[320px] max-w-[86vw] flex-col overflow-y-auto border-r transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex min-h-full flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-[calc(env(safe-area-inset-top)+18px)]">
              <div className="px-3 pb-5 pt-2">
                <Link
                  href={homeHref}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="внутри"
                  className="inline-flex max-w-full"
                >
                  <AppBrand />
                </Link>
              </div>

              <nav className="flex flex-col gap-2" aria-label="Навигация">
                {mobileMenuItems.map((item) => {
                  const href = getMobileMenuItemHref(item);
                  const isActive = isMobileMenuItemActive(item);

                  return (
                    <Link
                      key={item.name}
                      href={href}
                      onClick={(event) => handleMobileMenuItemClick(event, item)}
                      className={getMobilePanelItemClassName(isActive)}
                    >
                      <span className="relative flex h-8 w-8 flex-none items-center justify-center rounded-full">
                        {item.key === "profile" && user ? (
                          <>
                            <UserAvatar
                              avatarUrl={user.avatarUrl}
                              name={user.displayName || user.email}
                              size="menu"
                            />
                            {activeSection === "profile" ? (
                              <span className="pointer-events-none absolute h-8 w-8 rounded-full shadow-[inset_0_0_0_2px_var(--label-primary)]" />
                            ) : null}
                          </>
                        ) : (
                          <NavIcon name={item.key} filled={isActive} />
                        )}
                      </span>
                      <span className="flex-1">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto px-3 pb-2 pt-5">
                <LegalInfo />
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {!isAdminHeader ? (
        <MobileTabBar
          createTopicHref={createTopicHref}
          onRequireAuth={(nextHref) => openAuthModal({ nextHref })}
          pathname={pathname}
          router={router}
          user={user}
        />
      ) : null}
    </header>
  );
}
