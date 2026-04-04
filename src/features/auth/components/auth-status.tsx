"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAppTheme } from "@/components/theme/app-theme-provider";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { dispatchAuthStateChanged } from "@/features/auth/hooks/use-current-user";

type AuthStatusProps = {
  compact?: boolean;
};

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
      <div className="bg-[color-mix(in_srgb,var(--label-primary)_10%,transparent)] h-11 w-11 animate-pulse rounded-full" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className="interactive-fill inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold"
      >
        Войти
      </Link>
    );
  }

  const themeLabel = theme === "dark" ? "Темная" : "Светлая";
  const menuWidthClass = compact ? "w-[240px]" : "w-[260px]";
  const navigationItems = [
    {
      href: "/profile",
      label: "Мой профиль",
    },
    {
      href: "/settings",
      label: "Настройки",
    },
    {
      href: "/bookmarks",
      label: "Закладки",
    },
    {
      href: "/drafts",
      label: "Черновики",
    },
  ];

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
          size="md"
        />
      </button>

      {isMenuOpen ? (
        <div
          className={`surface-elevated border-separator absolute right-0 top-[calc(100%+8px)] z-[100] rounded-[20px] border p-2 shadow-[0_14px_32px_rgba(0,0,0,0.08)] ${menuWidthClass}`}
          role="menu"
        >
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
              }}
              className="comment-menu-item flex w-full items-center justify-between rounded-[14px] px-3 py-3 text-left text-[14px]"
            >
              <span>{item.label}</span>
            </Link>
          ))}

          <button
            type="button"
            role="menuitem"
            onClick={toggleTheme}
            className="comment-menu-item flex w-full cursor-pointer items-center justify-between rounded-[14px] px-3 py-3 text-left text-[14px]"
          >
            <span>Тема</span>
            <span className="text-[12px] font-medium text-[var(--label-secondary)]">
              {themeLabel}
            </span>
          </button>

          <div className="border-separator my-2 border-t" />

          <button
            type="button"
            role="menuitem"
            disabled={isSigningOut}
            onClick={() => {
              void handleSignOut();
            }}
            className="comment-menu-item flex w-full cursor-pointer items-center justify-between rounded-[14px] px-3 py-3 text-left text-[14px] text-[var(--accent-like)]"
          >
            <span>{isSigningOut ? "Выходим..." : "Выйти"}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
