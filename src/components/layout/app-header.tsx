"use client";

import { Badge, SearchField as HeroSearchField } from "@heroui/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_ACTIVE_SECTION,
  isNavigationItemCurrent,
  navItems,
} from "@/constants/navigation";
import {
  MenuRailIcon,
  NavIcon,
  NotificationIcon,
  PlusCircleIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button-styles";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { AuthStatus } from "@/features/auth/components/auth-status";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { AppBrand } from "@/components/layout/app-brand";
import { LegalInfo } from "@/components/layout/legal-info";
import { buildCreateTopicHref } from "@/features/topic-creation/lib/create-topic-navigation";
import type { NavigationItemKey } from "@/types/navigation";

type AppHeaderProps = {
  adminMode?: boolean;
  showCreateAction?: boolean;
  showSearch?: boolean;
};

const circularControlClassName =
  buttonClassName({
    className:
      "button--icon-only relative h-11 w-11 flex-none px-0 text-[var(--label-primary)]",
    size: "lg",
    variant: "tertiary",
  });

const mobileMenuButtonClassName =
  `${buttonClassName({
    className:
      "button--icon-only relative h-11 w-11 flex-none px-0 text-[var(--label-primary)]",
    size: "lg",
    variant: "tertiary",
  })} min-[721px]:hidden`;
const desktopHeaderSearchInputId = "app-header-search-input-desktop";
const mobileHeaderSearchInputId = "app-header-search-input-mobile";

function NotificationButton() {
  return (
    <Badge.Anchor className="relative flex-none">
      <HoverTooltip label="Уведомления">
        <button
          type="button"
          aria-label="Уведомления"
          className={`${circularControlClassName} overflow-visible`.trim()}
        >
          <span className="flex h-5 w-5 flex-none items-center justify-center">
            <NotificationIcon />
          </span>
        </button>
      </HoverTooltip>
      <Badge
        size="sm"
        variant="primary"
        className="pointer-events-none absolute top-2 right-2 min-h-[18px] min-w-[18px] select-none border-0 bg-[var(--accent-primary)] px-1 text-[11px] font-semibold leading-none text-white shadow-none"
      >
        3
      </Badge>
    </Badge.Anchor>
  );
}

function MobileMenuButton({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-haspopup="dialog"
      aria-controls="app-mobile-navigation"
      aria-label={expanded ? "Закрыть меню" : "Открыть меню"}
      onClick={onClick}
      className={mobileMenuButtonClassName}
    >
      <span className="flex h-5 w-5 flex-none items-center justify-center">
        <MenuRailIcon />
      </span>
    </button>
  );
}

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

function getMobilePanelItemClassName(isActive = false) {
  return buttonClassName({
    className: `min-h-14 h-auto w-full justify-start gap-3 px-4 py-3 text-left text-[16px] ${
      isActive
        ? "font-semibold text-[var(--label-primary)]"
        : "font-medium text-[var(--label-tertiary)]"
    }`,
    size: "lg",
    variant: "tertiary",
  });
}

function resolveActiveSection(pathname: string | null): NavigationItemKey {
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
  const { user } = useAuthClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeSection = resolveActiveSection(pathname);
  const isAdminHeader = adminMode;
  const homeHref = isAdminHeader ? "/admin/users" : "/";
  const isFeedHomePage = pathname === "/";
  const currentSearch = searchParams.toString();
  const currentPathWithSearch = pathname
    ? `${pathname}${currentSearch ? `?${currentSearch}` : ""}`
    : "/";
  const createTopicHref = buildCreateTopicHref(currentPathWithSearch);
  const shouldShowSearch = showSearch && !isAdminHeader;
  const shouldShowMobileSearchField = shouldShowSearch && isFeedHomePage;
  const shouldShowMobileSearchButton = shouldShowSearch && !isFeedHomePage;
  const shouldShowMobileCreateIconOnly = showCreateAction && !isAdminHeader && !isFeedHomePage;
  const shouldShowNotification = Boolean(user) && !isAdminHeader;

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
    const mediaQuery = window.matchMedia("(min-width: 721px)");

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

  function handleNavigationItemClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    item: (typeof navItems)[number],
  ) {
    if (!isNavigationItemCurrent(pathname, item)) {
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
    <header className={`surface-elevated border-separator relative z-50 shadow-[0_2px_12px_rgba(17,24,39,0.06)] ${
      isAdminHeader
        ? "fixed inset-x-0 top-0"
        : "min-[721px]:fixed min-[721px]:inset-x-0 min-[721px]:top-0"
    }`.trim()}>
      <div className={`relative z-10 mx-auto grid w-full max-w-[var(--app-shell-max-width)] items-center ${
        isAdminHeader
          ? "min-h-16 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-3 px-4 py-3 min-[1280px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[1280px]:px-[var(--app-shell-side-offset)]"
          : "gap-x-2 gap-y-3 px-3 py-3 sm:px-4 min-[721px]:h-16 min-[721px]:gap-3 min-[721px]:px-[var(--app-shell-side-offset)] min-[721px]:py-1 min-[721px]:grid-cols-[224px_minmax(0,1fr)_224px] min-[1025px]:grid-cols-[minmax(var(--app-shell-side-column-min-width),1fr)_minmax(0,var(--app-header-search-width))_minmax(var(--app-shell-side-column-min-width),1fr)] max-[720px]:grid-cols-[minmax(0,1fr)_auto]"
      }`}>
        <div className={`flex min-w-0 items-center ${
          isAdminHeader ? "gap-2" : "gap-1 sm:gap-2 min-[721px]:pl-5"
        }`.trim()}>
          {!isAdminHeader ? (
            <MobileMenuButton
              expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((currentState) => !currentState)}
            />
          ) : null}

          <Link
            href={homeHref}
            aria-label="внутри"
            className={`w-fit max-w-full cursor-pointer ${
              isAdminHeader ? "inline-flex" : "hidden min-[361px]:inline-flex min-[721px]:max-w-[var(--app-shell-side-rail-width)]"
            }`}
          >
            <AppBrand
              showAdminLabel={isAdminHeader}
              wordmarkClassName={isAdminHeader ? "h-7 w-auto shrink-0" : "h-7 w-auto shrink-0 min-[721px]:h-8"}
              labelClassName={isAdminHeader ? "h-[18px] w-auto shrink-0" : "h-[18px] w-auto shrink-0 min-[721px]:h-5"}
            />
          </Link>

        </div>

        {shouldShowSearch ? (
          <HeroSearchField
            aria-label="Поиск по историям, темам, психологам"
            className="surface--default hidden min-w-0 w-full justify-self-center overflow-visible border-0 bg-transparent p-0 shadow-none outline-none ring-0 focus-within:border-0 focus-within:shadow-none focus-within:outline-none min-[721px]:block"
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

        <div className="flex w-fit max-w-full min-w-0 items-center justify-end justify-self-end">
          <div className={`flex min-w-0 items-center ${
            isAdminHeader ? "gap-0" : "gap-0 min-[721px]:justify-start"
          }`.trim()}>
            {shouldShowMobileSearchButton ? (
              <button
                type="button"
                aria-label="Поиск"
                className={`${circularControlClassName} min-[721px]:hidden`.trim()}
              >
                <span className="flex h-5 w-5 flex-none items-center justify-center">
                  <SearchIcon />
                </span>
              </button>
            ) : null}
            {showCreateAction ? (
              <>
                {shouldShowMobileCreateIconOnly ? (
                  <CreateTopicButton
                    ariaLabel="Написать"
                    className="button--icon-only h-10 w-10 px-0 min-[481px]:hidden"
                    href={createTopicHref}
                    iconOnly
                  />
                ) : null}

                <CreateTopicButton
                  className={`h-10 px-3 text-[13px] min-[721px]:h-11 min-[721px]:px-4 min-[721px]:text-sm ${
                    shouldShowMobileCreateIconOnly ? "hidden min-[481px]:inline-flex" : ""
                  }`.trim()}
                  href={createTopicHref}
                >
                  Написать
                </CreateTopicButton>
              </>
            ) : null}
            {shouldShowNotification ? <NotificationButton /> : null}
          </div>

          <div className={`${showCreateAction || shouldShowNotification ? "ml-4" : ""} flex flex-none items-center`.trim()}>
            <AuthStatus compact hideNavigationItems={isAdminHeader} />
          </div>
        </div>

        {shouldShowMobileSearchField ? (
          <HeroSearchField
            aria-label="Поиск по историям, темам, психологам"
            className="surface--default col-span-2 w-full overflow-visible border-0 bg-transparent p-0 shadow-none outline-none ring-0 focus-within:border-0 focus-within:shadow-none focus-within:outline-none min-[721px]:hidden"
            fullWidth
          >
            <HeroSearchField.Group
              className="app-header-search-group h-11 min-h-11 w-full"
              onPointerDown={handleSearchGroupPointerDown}
            >
              <HeroSearchField.SearchIcon />
              <HeroSearchField.Input
                id={mobileHeaderSearchInputId}
                aria-label="Поиск по историям, темам, психологам"
                placeholder="Поиск по историям, темам, психологам"
                suppressHydrationWarning
                className="!text-[16px] !leading-5"
              />
              <HeroSearchField.ClearButton aria-label="Очистить поиск" />
            </HeroSearchField.Group>
          </HeroSearchField>
        ) : null}
      </div>

      <div
        className={`fixed inset-0 z-[120] min-[721px]:hidden ${
          isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={() => setIsMobileMenuOpen(false)}
          className={`overlay-scrim absolute inset-0 transition-opacity duration-300 ease-out ${
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
                <AppBrand showAdminLabel={isAdminHeader} />
              </Link>
            </div>

            <nav className="flex flex-col gap-2" aria-label="Навигация">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={(event) => {
                    setIsMobileMenuOpen(false);
                    handleNavigationItemClick(event, item);
                  }}
                  className={getMobilePanelItemClassName(item.key === activeSection)}
                >
                  <span className="flex h-8 w-8 flex-none items-center justify-center">
                    <NavIcon name={item.key} filled={item.key === activeSection} />
                  </span>
                  <span className="flex-1">{item.name}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-auto px-3 pb-2 pt-5">
              {showCreateAction ? (
                <CreateTopicButton
                  className="h-12 w-full justify-center px-4 text-[15px]"
                  href={createTopicHref}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                  }}
                  variant="secondary"
                >
                  Написать
                </CreateTopicButton>
              ) : null}
              <LegalInfo className={showCreateAction ? "mt-5 pt-5" : ""} />
            </div>
          </div>
        </aside>
      </div>
    </header>
  );
}
