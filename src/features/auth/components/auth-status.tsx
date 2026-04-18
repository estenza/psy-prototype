"use client";

import { Chip, Dropdown, Label } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClassName } from "@/components/ui/button-styles";
import { UserAvatarAction } from "@/components/ui/user-avatar-action";
import {
  LogOutIcon,
  ProfileCircleIcon,
  SettingsSlidersIcon,
} from "@/components/ui/icons";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { dispatchAuthStateChanged } from "@/features/auth/hooks/use-current-user";
import { getUserHandle } from "@/features/auth/lib/profile";
import type { AuthUser } from "@/features/auth/types";

type AuthStatusProps = {
  compact?: boolean;
  hideNavigationItems?: boolean;
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

export function AuthStatus({
  compact = false,
  hideNavigationItems = false,
}: AuthStatusProps) {
  const router = useRouter();
  const { status, user } = useAuthClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
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
        className={`bg-[var(--fill-control-subtle-hover)] animate-pulse rounded-full ${
          compact ? "h-9 w-9" : "h-11 w-11"
        }`}
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className={buttonClassName({
          className: `rounded-full font-semibold ${
            compact
              ? "type-caption-medium h-10 px-3 lg:h-11 lg:px-4 lg:text-sm"
              : "h-11 px-4 text-sm"
          }`,
          variant: "primary",
        })}
      >
        Войти
      </Link>
    );
  }

  const menuWidthClass = compact ? "w-[272px] lg:w-[304px]" : "w-[304px]";
  const adminBadgeLabel = getAdminBadgeLabel(user);
  const accountName = getUserHandle(user);
  const navigationItems = [
    {
      href: "/profile",
      label: "Профиль",
      icon: <ProfileCircleIcon />,
    },
    {
      href: "/settings",
      label: "Настройки",
      icon: <SettingsSlidersIcon />,
    },
    {
      href: "/bookmarks",
      label: "Закладки",
    },
    {
      href: "/drafts",
      label: "Черновики",
    },
  ] as const;

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        aria-label="Открыть меню профиля"
        className="inline-flex cursor-pointer rounded-full p-0"
      >
        <UserAvatarAction
          avatarUrl={user.avatarUrl}
          ariaLabel="Открыть меню профиля"
          interactive
          name={user.displayName}
          showStatusDot
          size={compact ? "header" : "md"}
        />
      </Dropdown.Trigger>

      <Dropdown.Popover placement="bottom end" className={menuWidthClass}>
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-3">
            <UserAvatar avatarUrl={user.avatarUrl} name={user.displayName} size="md" />

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="type-label-lg min-w-0 truncate text-[var(--label-primary)]">
                  {user.displayName}
                </p>
                {adminBadgeLabel ? (
                  <Chip color="default" size="sm" variant="soft">
                    {adminBadgeLabel}
                  </Chip>
                ) : null}
              </div>
              <p className="type-caption truncate text-[var(--label-secondary)]">
                {accountName}
              </p>
            </div>
          </div>
        </div>

        <Dropdown.Menu
          aria-label="Меню профиля"
          selectionMode="none"
          onAction={(key) => {
            const action = String(key);

            if (action === "sign-out") {
              void handleSignOut();
              return;
            }

            const navigationItem = navigationItems.find((item) => item.href === action);

            if (navigationItem) {
              router.push(navigationItem.href);
            }
          }}
          className="p-2 pt-1"
        >
          {hideNavigationItems
            ? null
            : navigationItems.map((item) => (
                <Dropdown.Item
                  key={item.href}
                  id={item.href}
                  textValue={item.label}
                  className="font-medium"
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <Label className="type-menu-label min-w-0 flex-1 truncate text-[var(--label-primary)]">
                      {item.label}
                    </Label>
                    {"icon" in item && item.icon ? (
                      <span className="flex-none text-[var(--label-secondary)]">{item.icon}</span>
                    ) : null}
                  </div>
                </Dropdown.Item>
              ))}

          <Dropdown.Item
            key="sign-out"
            id="sign-out"
            textValue={isSigningOut ? "Выходим..." : "Выйти"}
            isDisabled={isSigningOut}
            variant="danger"
            className="font-medium"
          >
            <div className="flex w-full items-center justify-between gap-3">
              <Label className="type-menu-label min-w-0 flex-1 truncate">
                {isSigningOut ? "Выходим..." : "Выйти"}
              </Label>
              <span className="flex-none text-danger">
                <LogOutIcon />
              </span>
            </div>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}
