"use client";

import { Chip, Dropdown, Label } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClassName } from "@/components/ui/button-styles";
import { UserAvatarAction } from "@/components/ui/user-avatar-action";
import {
  AdminShieldIcon,
  LogOutIcon,
  ProfileCircleIcon,
  SettingsSlidersIcon,
} from "@/components/ui/icons";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { dispatchAuthStateChanged } from "@/features/auth/hooks/use-current-user";
import { canAccessAdminConsole } from "@/features/admin/lib/admin-console";
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
  const { openAuthModal, status, user } = useAuthClient();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [adminConsoleUrl, setAdminConsoleUrl] = useState<string | null>(null);
  const [publicSiteUrl, setPublicSiteUrl] = useState<string | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol;
    const host = window.location.host;
    const publicHost = host.replace(/^admin\./, "");
    const resolvedAdminHost = host.startsWith("admin.") ? host : `admin.${publicHost}`;

    setAdminConsoleUrl(`${protocol}//${resolvedAdminHost}`);

    if (hideNavigationItems) {
      setPublicSiteUrl(`${protocol}//${publicHost}`);
    }
  }, [hideNavigationItems]);

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
      <button
        type="button"
        onClick={openAuthModal}
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
      </button>
    );
  }

  const menuWidthClass = compact ? "w-[272px] lg:w-[304px]" : "w-[304px]";
  const adminBadgeLabel = getAdminBadgeLabel(user);
  const canOpenAdminConsole = canAccessAdminConsole(user);
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
          className="dropdown-menu-profile p-2 pt-1"
          onAction={(key) => {
            const action = String(key);

            if (action === "sign-out") {
              void handleSignOut();
              return;
            }

            if (action === "back-to-site" && publicSiteUrl) {
              window.location.href = publicSiteUrl;
              return;
            }

            if (action === "open-admin-console" && adminConsoleUrl) {
              window.location.href = adminConsoleUrl;
              return;
            }

            const navigationItem = navigationItems.find((item) => item.href === action);

            if (navigationItem) {
              router.push(navigationItem.href);
            }
          }}
        >
          {hideNavigationItems && publicSiteUrl ? (
            <Dropdown.Item
              key="back-to-site"
              id="back-to-site"
              textValue="На главную"
              className="font-medium"
            >
              <div className="flex w-full items-center justify-between gap-3">
                <Label className="type-menu-label min-w-0 flex-1 truncate text-[var(--label-primary)]">
                  На главную
                </Label>
              </div>
            </Dropdown.Item>
          ) : null}
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

          {!hideNavigationItems && canOpenAdminConsole && adminConsoleUrl ? (
            <Dropdown.Item
              key="open-admin-console"
              id="open-admin-console"
              textValue="Админка"
              className="font-medium"
            >
              <div className="flex w-full items-center justify-between gap-3">
                <Label className="type-menu-label min-w-0 flex-1 truncate text-[var(--label-primary)]">
                  Админка
                </Label>
                <span className="flex-none text-[var(--label-secondary)]">
                  <AdminShieldIcon />
                </span>
              </div>
            </Dropdown.Item>
          ) : null}

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
