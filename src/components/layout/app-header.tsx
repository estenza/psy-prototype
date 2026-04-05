"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_ACTIVE_SECTION, navItems } from "@/constants/navigation";
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
      aria-haspopup="menu"
      aria-label={expanded ? "Закрыть меню" : "Открыть меню"}
      onClick={onClick}
      className={`${circularControlClassName} lg:hidden`}
    >
      <MenuRailIcon />
      <HoverTooltip label="Меню" />
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
  const matchedItem = navItems.find((item) => {
    if (item.href === "#") {
      return false;
    }

    if (item.href === "/") {
      return pathname === "/";
    }

    return pathname === item.href || pathname?.startsWith(`${item.href}/`);
  });

  return matchedItem?.key ?? DEFAULT_ACTIVE_SECTION;
}

export function AppHeader({
  showCreateAction = true,
  showSearch = true,
}: AppHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuthClient();
  const { requireAuth } = useAuthRequiredAction();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const activeSection = resolveActiveSection(pathname);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (mobileMenuRef.current?.contains(target)) {
        return;
      }

      setIsMobileMenuOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileMenuOpen]);

  async function handleCreateTopicClick(event: React.MouseEvent<HTMLAnchorElement>) {
    await requireAuth(event);
  }

  return (
    <header className="surface-primary border-separator relative z-50 border-b min-[721px]:fixed min-[721px]:inset-x-0 min-[721px]:top-0">
      <div className="relative z-10 mx-auto grid w-full max-w-[var(--app-shell-max-width)] items-center gap-x-2 gap-y-3 px-3 py-3 sm:px-4 min-[721px]:h-16 min-[721px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[721px]:gap-3 min-[721px]:py-1 lg:grid-cols-[minmax(var(--app-shell-side-column-min-width),1fr)_minmax(0,var(--app-header-search-width))_minmax(var(--app-shell-side-column-min-width),1fr)] lg:px-[var(--app-shell-side-offset)] max-[720px]:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <div ref={mobileMenuRef} className="relative flex items-center lg:hidden">
            <MobileMenuButton
              expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((currentState) => !currentState)}
            />

            {isMobileMenuOpen ? (
              <nav
                className="surface-elevated border-separator absolute left-0 top-[calc(100%+8px)] z-[100] w-[280px] max-w-[calc(100vw-24px)] rounded-[20px] border p-2 shadow-[0_14px_32px_rgba(0,0,0,0.08)]"
                aria-label="Разделы"
                role="menu"
              >
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    role="menuitem"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                    }}
                    className={`comment-menu-item flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left text-[15px] ${
                      item.key === activeSection
                        ? "bg-[var(--fill-secondary)] font-semibold text-[var(--label-primary)]"
                        : "text-[var(--label-secondary)]"
                    }`}
                  >
                    <span className="flex h-8 w-8 flex-none items-center justify-center">
                      <NavIcon name={item.key} filled={item.key === activeSection} />
                    </span>
                    <span className="flex-1">{item.name}</span>
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>

          <Link
            href="/"
            className="app-brand font-helvetica hidden w-fit max-w-full cursor-pointer text-[26px] font-black leading-none min-[361px]:block sm:text-[30px] lg:max-w-[var(--app-shell-side-rail-width)] lg:text-[32px]"
          >
            внутри.
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
    </header>
  );
}
