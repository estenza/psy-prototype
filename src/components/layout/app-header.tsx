"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import { NotificationIcon, PlusCircleIcon, SearchIcon } from "@/components/ui/icons";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import { AuthStatus } from "@/features/auth/components/auth-status";
import { HoverTooltip } from "@/components/ui/hover-tooltip";

type AppHeaderProps = {
  showCreateAction?: boolean;
  showSearch?: boolean;
};

type SearchFieldProps = {
  autoFocus?: boolean;
  className: string;
  placeholder: string;
};

function SearchField({
  autoFocus = false,
  className,
  placeholder,
}: SearchFieldProps) {
  return (
    <label className={`search-field flex items-center gap-3 rounded-full text-sm ${className}`}>
      <SearchIcon />
      <input
        autoFocus={autoFocus}
        type="search"
        placeholder={placeholder}
        className="text-label-primary w-full min-w-0 bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-[var(--label-secondary)]"
      />
    </label>
  );
}

function NotificationButton() {
  return (
    <button
      aria-label="Уведомления"
      className="interactive-control group/tooltip relative inline-flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full text-[var(--label-primary)] transition-colors"
    >
      <NotificationIcon />
      <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-like)] px-1 text-[10px] font-semibold text-[var(--label-inverse)]">
        3
      </span>
      <HoverTooltip label="Уведомления" />
    </button>
  );
}

type SearchTriggerButtonProps = {
  buttonRef?: Ref<HTMLButtonElement>;
  expanded: boolean;
  onClick: () => void;
};

function SearchTriggerButton({
  buttonRef,
  expanded,
  onClick,
}: SearchTriggerButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-expanded={expanded}
      aria-haspopup="dialog"
      aria-label={expanded ? "Скрыть поиск" : "Искать"}
      onClick={onClick}
      className="interactive-fill inline-flex h-11 flex-none cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium"
    >
      <SearchIcon />
      <span>Искать</span>
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

export function AppHeader({
  showCreateAction = true,
  showSearch = true,
}: AppHeaderProps) {
  const { user } = useAuthClient();
  const { requireAuth } = useAuthRequiredAction();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchOverlayRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchTriggerRef = useRef<HTMLButtonElement | null>(null);
  const isMobileSearchOpen = showSearch && mobileSearchOpen;

  useEffect(() => {
    if (!isMobileSearchOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (mobileSearchOverlayRef.current?.contains(target)) {
        return;
      }

      if (mobileSearchTriggerRef.current?.contains(target)) {
        return;
      }

      setMobileSearchOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileSearchOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileSearchOpen]);

  async function handleCreateTopicClick(event: React.MouseEvent<HTMLAnchorElement>) {
    await requireAuth(event);
  }

  return (
    <header className="surface-primary border-separator fixed inset-x-0 top-0 z-50 border-b">
      {isMobileSearchOpen ? (
        <button
          type="button"
          aria-label="Закрыть поиск"
          onClick={() => setMobileSearchOpen(false)}
          className="fixed inset-x-0 bottom-0 top-[var(--app-header-height)] z-0 bg-[color-mix(in_srgb,var(--label-primary)_10%,transparent)] xl:hidden"
        />
      ) : null}

      <div className="relative z-10 mx-auto flex h-16 w-full max-w-[var(--app-shell-max-width)] items-center gap-3 px-4 py-1 sm:px-6 xl:grid xl:grid-cols-[minmax(var(--app-shell-side-column-min-width),1fr)_minmax(0,var(--app-header-search-width))_minmax(var(--app-shell-side-column-min-width),1fr)] xl:px-5">
        <div className="flex flex-none items-center xl:justify-end xl:pl-10 xl:pr-6">
          <div className="-ml-[52px] w-full max-w-[var(--app-shell-side-rail-width)]">
            <Link
              href="/"
              className="app-brand font-helvetica cursor-pointer text-[32px] font-black leading-none"
            >
              внутри.
            </Link>
          </div>
        </div>

        <div className="hidden items-center justify-center xl:flex">
          {showSearch ? (
            <SearchField
              className="w-full px-5 py-3"
              placeholder="Поиск по историям, темам, психологам"
            />
          ) : null}
        </div>

        <div className="hidden xl:block xl:justify-self-start xl:pl-6 xl:pr-10">
          <div className="flex items-center justify-start gap-4">
            <div className="flex items-center gap-0">
              {showCreateAction ? (
                <CreateTopicButton
                  className="px-7 py-3"
                  onClick={handleCreateTopicClick}
                />
              ) : null}
              {user ? <NotificationButton /> : null}
            </div>
            <AuthStatus />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1 xl:hidden">
          {showSearch ? (
            <SearchTriggerButton
              buttonRef={mobileSearchTriggerRef}
              expanded={isMobileSearchOpen}
              onClick={() => setMobileSearchOpen((current) => !current)}
            />
          ) : null}
          <div className="flex items-center gap-0">
            {showCreateAction ? (
              <CreateTopicButton
                className="px-5 py-3"
                onClick={handleCreateTopicClick}
              >
                <span className="hidden sm:inline">Создать обсуждение</span>
                <span className="sm:hidden">Обсуждение</span>
              </CreateTopicButton>
            ) : null}
            {user ? <NotificationButton /> : null}
          </div>
          <AuthStatus compact />
        </div>
      </div>

      {isMobileSearchOpen ? (
        <div
          ref={mobileSearchOverlayRef}
          className="surface-primary border-separator absolute inset-x-0 top-full z-20 border-b px-4 py-3 sm:px-6 xl:hidden"
        >
          <div className="mx-auto w-full max-w-[var(--app-shell-max-width)]">
            <SearchField
              autoFocus
              className="w-full px-4 py-3"
              placeholder="Поиск по историям, темам, психологам"
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}
