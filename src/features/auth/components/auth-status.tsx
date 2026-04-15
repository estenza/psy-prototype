"use client";

import { Chip, Dropdown, Label } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClassName } from "@/components/ui/button";
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
        className={buttonClassName({
          className: `rounded-full font-semibold ${
            compact
              ? "h-10 px-3 text-[13px] lg:h-11 lg:px-4 lg:text-sm"
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
        <UserAvatar
          avatarUrl={user.avatarUrl}
          name={user.displayName}
          showStatusDot
          size={compact ? "sm" : "md"}
        />
      </Dropdown.Trigger>

      <Dropdown.Popover placement="bottom end" className={menuWidthClass}>
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-3">
            <UserAvatar avatarUrl={user.avatarUrl} name={user.displayName} size="md" />

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="min-w-0 truncate text-[15px] font-medium leading-5 text-[var(--label-primary)]">
                  {user.displayName}
                </p>
                {adminBadgeLabel ? (
                  <Chip color="default" size="sm" variant="soft">
                    {adminBadgeLabel}
                  </Chip>
                ) : null}
              </div>
              <p className="truncate text-[13px] leading-5 text-[var(--label-secondary)]">
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
                    <Label className="min-w-0 flex-1 truncate text-[15px] font-medium leading-6 text-[var(--label-primary)]">
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
              <Label className="min-w-0 flex-1 truncate text-[15px] font-medium leading-6">
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
