"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAppTheme } from "@/components/theme/app-theme-provider";
import {
  BookmarkIcon,
  DraftsIcon,
  LogOutIcon,
  ProfileCircleIcon,
  SettingsSlidersIcon,
  ThemeMoonIcon,
} from "@/components/ui/icons";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { dispatchAuthStateChanged } from "@/features/auth/hooks/use-current-user";
import { getUserHandle } from "@/features/auth/lib/profile";
import type { AuthUser } from "@/features/auth/types";

type AuthStatusProps = {
  compact?: boolean;
};

function getAdminBadgeLabel(
  user: Pick<AuthUser, "isAdmin" | "isModerator">,
) {
  if (user.isAdmin) {
    return "admin";
  }

  if (user.isModerator) {
    return "moderator";
  }

  return null;
}

export function AuthStatus({ compact = false }: AuthStatusProps) {
  const router = useRouter();
  const { status, user } = useAuthClient();
  const { theme, toggleTheme } = useAppTheme();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!menuRef.current?.contains(target)) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  async function handleSignOut() {
    setIsMenuOpen(false);
    setIsSigningOut(true);

    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
      });
      dispatchAuthStateChanged();
      router.refresh();
      router.push("/");
    } finally {
      setIsSigningOut(false);
    }
  }

  if (status === "loading") {
    return (
      <div
        className={`bg-[color-mix(in_srgb,var(--label-primary)_10%,transparent)] animate-pulse rounded-full ${
          compact ? "h-10 w-10 lg:h-11 lg:w-11" : "h-11 w-11"
        }`}
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className={`interactive-solid inline-flex items-center rounded-full font-semibold ${
          compact
            ? "h-10 px-3 text-[13px] lg:h-11 lg:px-4 lg:text-sm"
            : "h-11 px-4 text-sm"
        }`}
      >
        Войти
      </Link>
    );
  }

  const themeLabel = theme === "dark" ? "Темная" : "Светлая";
  const menuWidthClass = compact ? "w-[272px] lg:w-[304px]" : "w-[304px]";
  const profileHandle = getUserHandle(user);
  const adminBadgeLabel = getAdminBadgeLabel(user);
  const navigationItems = [
    {
      href: "/settings",
      label: "Настройки",
      icon: <SettingsSlidersIcon />,
    },
    {
      href: "/bookmarks",
      label: "Закладки",
      icon: <BookmarkIcon />,
    },
    {
      href: "/drafts",
      label: "Черновики",
      icon: <DraftsIcon />,
    },
  ] as const;

  return (
    <div ref={menuRef} className={`relative ${isMenuOpen ? "z-[90]" : "z-20"}`}>
      <button
        type="button"
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label="Открыть меню профиля"
        onClick={() => {
          setIsMenuOpen((currentState) => !currentState);
        }}
        className="inline-flex cursor-pointer rounded-full"
      >
        <UserAvatar
          avatarUrl={user.avatarUrl}
          name={user.displayName}
          showStatusDot
          size={compact ? "sm" : "md"}
        />
      </button>

      {isMenuOpen ? (
        <div
          className={`surface-elevated border-separator absolute right-0 top-[calc(100%+8px)] z-[100] rounded-[20px] border p-2 shadow-[0_14px_32px_rgba(0,0,0,0.08)] ${menuWidthClass}`}
          role="menu"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => {
              setIsMenuOpen(false);
            }}
            className="comment-menu-item flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left"
          >
            <span className="flex-none text-[var(--label-secondary)]">
              <ProfileCircleIcon />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--label-tertiary)]">
                Мой профиль
              </span>
              <span className="mt-1 flex items-center gap-2">
                <span className="truncate text-[15px] font-medium text-[var(--label-primary)]">
                  {profileHandle}
                </span>
                {adminBadgeLabel ? (
                  <span className="inline-flex flex-none items-center rounded-full bg-[var(--fill-tertiary)] px-2 py-1 text-[11px] font-semibold text-[var(--label-secondary)]">
                    {adminBadgeLabel}
                  </span>
                ) : null}
              </span>
            </span>
          </Link>

          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
              }}
              className="comment-menu-item flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left text-[14px]"
            >
              <span className="flex-none text-[var(--label-secondary)]">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}

          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            onClick={toggleTheme}
            className="comment-menu-item flex w-full cursor-pointer items-center gap-3 rounded-[14px] px-3 py-3 text-left text-[14px]"
          >
            <span className="flex-none text-[var(--label-secondary)]">
              <ThemeMoonIcon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-[var(--label-primary)]">
                Тема
              </span>
              <span className="mt-0.5 block text-[12px] text-[var(--label-secondary)]">
                {themeLabel}
              </span>
            </span>
            <ToggleSwitch checked={theme === "dark"} />
          </button>

          <div className="border-separator my-2 border-t" />

          <button
            type="button"
            role="menuitem"
            disabled={isSigningOut}
            onClick={() => {
              void handleSignOut();
            }}
            className="comment-menu-item flex w-full cursor-pointer items-center gap-3 rounded-[14px] px-3 py-3 text-left text-[14px] text-[var(--accent-like)]"
          >
            <span className="flex-none">
              <LogOutIcon />
            </span>
            <span className="flex-1">{isSigningOut ? "Выходим..." : "Выйти"}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
