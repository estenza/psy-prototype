"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import { AuthStatus } from "@/features/auth/components/auth-status";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { AppBrand } from "@/components/layout/app-brand";
import { LegalInfo } from "@/components/layout/legal-info";
import type { NavigationItemKey } from "@/types/navigation";

type AppHeaderProps = {
  showCreateAction?: boolean;
  showSearch?: boolean;
};

type SearchFieldProps = {
  autoFocus?: boolean;
  className: string;
  inputClassName?: string;
  placeholder: string;
};

function SearchField({
  autoFocus = false,
  className,
  inputClassName = "w-full",
  placeholder,
}: SearchFieldProps) {
  return (
    <label className={`search-field items-center gap-3 rounded-full text-sm ${className}`}>
      <span className="text-label-tertiary">
        <SearchIcon />
      </span>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <input
          aria-label={placeholder}
          autoFocus={autoFocus}
          type="search"
          placeholder={placeholder}
          className={`search-field-input text-label-primary block min-w-0 bg-transparent text-sm font-medium leading-5 outline-none placeholder:text-transparent ${inputClassName}`}
        />
        <span className="search-field-placeholder" aria-hidden="true">
          <span className="search-field-placeholder-text">{placeholder}</span>
        </span>
      </div>
    </label>
  );
}

const circularControlClassName =
  "interactive-control group/tooltip relative inline-flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full text-[var(--label-primary)] transition-colors";

const mobileMenuButtonClassName =
  "interactive-control relative inline-flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full text-[var(--label-primary)] transition-colors lg:hidden";

function NotificationButton() {
  return (
    <button
      aria-label="Уведомления"
      className={circularControlClassName}
    >
      <NotificationIcon />
      <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-like)] px-1 text-[10px] font-semibold text-[var(--label-inverse)]">
        3
      </span>
      <HoverTooltip label="Уведомления" />
    </button>
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
  children?: ReactNode;
  className: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

function CreateTopicButton({
  children,
  className,
  onClick,
}: CreateTopicButtonProps) {
  return (
    <Link
      href="/create-topic"
      onClick={onClick}
      className={`interactive-control inline-flex flex-none cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold text-[var(--label-primary)] transition-colors ${className}`}
    >
      <span className="flex-none">
        <PlusCircleIcon />
      </span>
      <span className="whitespace-nowrap">{children ?? "Создать обсуждение"}</span>
    </Link>
  );
}

function resolveActiveSection(pathname: string | null): NavigationItemKey {
  const matchedItem = navItems.find((item) => isNavigationItemCurrent(pathname, item));

  return matchedItem?.key ?? DEFAULT_ACTIVE_SECTION;
}

export function AppHeader({
  showCreateAction = true,
  showSearch = true,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthClient();
  const { requireAuth } = useAuthRequiredAction();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeSection = resolveActiveSection(pathname);

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
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

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

  async function handleCreateTopicClick(event: React.MouseEvent<HTMLAnchorElement>) {
    await requireAuth(event);
  }

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

  return (
    <header className="surface-primary border-separator relative z-50 border-b min-[721px]:fixed min-[721px]:inset-x-0 min-[721px]:top-0">
      <div className="relative z-10 mx-auto grid w-full max-w-[var(--app-shell-max-width)] items-center gap-x-2 gap-y-3 px-3 py-3 sm:px-4 min-[721px]:h-16 min-[721px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[721px]:gap-3 min-[721px]:py-1 lg:grid-cols-[minmax(var(--app-shell-side-column-min-width),1fr)_minmax(0,var(--app-header-search-width))_minmax(var(--app-shell-side-column-min-width),1fr)] lg:px-[var(--app-shell-side-offset)] max-[720px]:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2 lg:pl-5">
          <MobileMenuButton
            expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((currentState) => !currentState)}
          />

          <Link
            href="/"
            aria-label="внутри"
            className="hidden w-fit max-w-full cursor-pointer min-[361px]:inline-flex lg:max-w-[var(--app-shell-side-rail-width)]"
          >
            <AppBrand
              wordmarkClassName="h-[22px] w-auto shrink-0 sm:h-7 lg:h-8"
              labelClassName="h-[14px] w-auto shrink-0 sm:h-[18px] lg:h-5"
            />
          </Link>
        </div>

        {showSearch ? (
          <SearchField
            className="hidden w-full min-w-0 justify-self-center px-4 py-3 min-[721px]:flex sm:justify-self-auto lg:px-5"
            placeholder="Поиск по историям, темам, психологам"
          />
        ) : null}

        <div className="flex w-fit max-w-full min-w-0 items-center justify-end justify-self-end gap-1 sm:gap-2 lg:justify-start">
          {showCreateAction ? (
            <CreateTopicButton
              className="h-10 px-3 text-[13px] min-[721px]:h-11 min-[721px]:px-4 min-[721px]:text-sm"
              onClick={handleCreateTopicClick}
            >
              <>
                <span className="inline lg:hidden">Создать</span>
                <span className="hidden lg:inline">Создать обсуждение</span>
              </>
            </CreateTopicButton>
          ) : null}
          {user ? <NotificationButton /> : null}
          <AuthStatus compact />
        </div>

        {showSearch ? (
          <SearchField
            className="col-span-2 flex w-full px-4 py-3 min-[721px]:hidden"
            placeholder="Поиск по историям, темам, психологам"
          />
        ) : null}
      </div>

      <div
        className={`fixed inset-0 z-[120] lg:hidden ${
          isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={() => setIsMobileMenuOpen(false)}
          className={`absolute inset-0 bg-[rgba(10,12,16,0.32)] transition-opacity duration-300 ease-out ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          id="app-mobile-navigation"
          aria-label="Разделы"
          className={`surface-primary border-separator relative flex h-full w-[320px] max-w-[86vw] flex-col overflow-y-auto border-r transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex min-h-full flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-[calc(env(safe-area-inset-top)+18px)]">
            <div className="px-3 pb-5 pt-2">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="внутри"
                className="inline-flex max-w-full"
              >
                <AppBrand />
              </Link>
            </div>

            <nav className="flex flex-col gap-1" aria-label="Навигация">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={(event) => {
                    setIsMobileMenuOpen(false);
                    handleNavigationItemClick(event, item);
                  }}
                  className={`comment-menu-item flex min-h-14 items-center gap-3 rounded-[18px] px-3 py-3 text-left text-[16px] ${
                    item.key === activeSection
                      ? "bg-[var(--fill-secondary)] font-semibold text-[var(--label-primary)]"
                      : "text-[var(--label-tertiary)]"
                  }`}
                >
                  <span className="flex h-8 w-8 flex-none items-center justify-center">
                    <NavIcon name={item.key} />
                  </span>
                  <span className="flex-1">{item.name}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-auto px-3 pb-2 pt-5">
              {showCreateAction ? (
                <CreateTopicButton
                  className="interactive-fill h-12 w-full justify-center px-4 text-[15px]"
                  onClick={async (event) => {
                    setIsMobileMenuOpen(false);
                    await handleCreateTopicClick(event);
                  }}
                >
                  Создать обсуждение
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
