"use client";

import { Chip, Dropdown, Label } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClassName } from "@/components/ui/button-styles";
import { UserAvatarAction } from "@/components/ui/user-avatar-action";
import {
  AdminShieldIcon,
  LogOutIcon,
  SettingsSlidersIcon,
} from "@/components/ui/icons";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { dispatchAuthStateChanged } from "@/features/auth/hooks/use-current-user";
import { canAccessAdminConsole } from "@/features/admin/lib/admin-console";
import { buildOwnProfilePath, getUserHandle } from "@/features/auth/lib/profile";
import type { AuthUser } from "@/features/auth/types";

type AuthStatusProps = {
  compact?: boolean;
  hideNavigationItems?: boolean;
};

function ProfileMenuBookmarkIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14 1.75C15.5187 1.75001 16.75 2.98127 16.75 4.5V17.4092C16.75 18.4785 15.4948 19.0542 14.6846 18.3564L10.1631 14.4639C10.0693 14.3831 9.93068 14.3831 9.83691 14.4639L5.31543 18.3564C4.50516 19.0542 3.25 18.4785 3.25 17.4092V4.5C3.25001 2.98122 4.48122 1.75 6 1.75H14ZM6 3.25C5.30965 3.25 4.75001 3.80965 4.75 4.5V16.8633L8.8584 13.3271C9.51475 12.762 10.4853 12.762 11.1416 13.3271L15.25 16.8633V4.5C15.25 3.80969 14.6903 3.25001 14 3.25H6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ProfileMenuDraftIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M16.5826 8.29327C16.9736 7.90224 17.6075 7.90224 17.9985 8.29327L18.7065 9.0013C19.0975 9.39233 19.0975 10.0263 18.7065 10.4173L17.9985 11.1254L15.8746 9.0013L16.5826 8.29327Z"
        fill="currentColor"
      />
      <path
        d="M14.8939 9.98136L17.0178 12.1054L12.6801 16.4434C12.2405 16.8831 11.7045 17.2144 11.1147 17.411L9.39563 17.9841C9.16081 18.0623 8.93742 17.8389 9.01569 17.6041L9.58871 15.8849C9.78532 15.295 10.1166 14.759 10.5562 14.3194L14.8939 9.98136Z"
        fill="currentColor"
      />
      <path
        d="M17.5 4.75C17.5 4.33579 17.1585 4 16.7562 4H2.74385C2.33303 4 2 4.3329 2 4.75C2 5.16421 2.34148 5.5 2.74385 5.5H16.7562C17.167 5.5 17.5 5.1671 17.5 4.75ZM12 9.75C12 9.33579 11.6585 9 11.2562 9H2.74385C2.33303 9 2 9.3329 2 9.75C2 10.1642 2.34148 10.5 2.74385 10.5H11.2562C11.667 10.5 12 10.1671 12 9.75ZM2 14.75C2 15.1642 2.33746 15.5 2.75513 15.5H6.24488C6.66193 15.5 7.00002 15.1671 7.00002 14.75C7.00002 14.3358 6.66256 14 6.24488 14H2.75513C2.33809 14 2 14.3329 2 14.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ProfileMenuChevronIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden="true">
      <path
        d="M3.97009 1.46457C4.26297 1.17203 4.73784 1.17191 5.03064 1.46457L9.03064 5.46457C9.32343 5.75736 9.32323 6.2322 9.03064 6.52512L5.03064 10.5251C4.73775 10.818 4.26299 10.818 3.97009 10.5251C3.67733 10.2322 3.67724 9.75742 3.97009 9.46457L7.43982 5.99484L3.97009 2.52512C3.67733 2.23221 3.67724 1.75742 3.97009 1.46457Z"
        fill="currentColor"
      />
    </svg>
  );
}

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
        onClick={() => openAuthModal()}
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
  const ownProfilePath = buildOwnProfilePath(user) ?? "/profile";
  const navigationItems = [
    {
      href: "/settings",
      label: "Настройки",
      icon: <SettingsSlidersIcon />,
    },
    {
      href: "/bookmarks",
      label: "Сохранённое",
      icon: <ProfileMenuBookmarkIcon />,
    },
    {
      href: "/drafts",
      label: "Черновики",
      icon: <ProfileMenuDraftIcon />,
    },
  ] as const;
  const navigationItemsBeforeAdmin = navigationItems.slice(0, 1);
  const navigationItemsAfterAdmin = navigationItems.slice(1);

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
          showStatusDot={false}
          size={compact ? "header" : "md"}
        />
      </Dropdown.Trigger>

      <Dropdown.Popover placement="bottom end" className={menuWidthClass}>
        <Dropdown.Menu
          aria-label="Меню профиля"
          selectionMode="none"
          className="dropdown-menu-default dropdown-menu-profile p-2"
          onAction={(key) => {
            const action = String(key);

            if (action === "sign-out") {
              void handleSignOut();
              return;
            }

            if (action === "profile-summary") {
              router.push(ownProfilePath);
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
          <Dropdown.Item
            key="profile-summary"
            id="profile-summary"
            textValue={`Профиль ${user.displayName} ${accountName}`}
            className="mb-3 font-normal"
          >
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <UserAvatar avatarUrl={user.avatarUrl} name={user.displayName} size="md" />

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <p className="profile-summary-name type-label-lg min-w-0 truncate text-[var(--label-primary)]">
                      {user.displayName}
                    </p>
                    {adminBadgeLabel ? (
                      <Chip color="default" size="sm" variant="soft" className="moderator-role-chip">
                        <span className="text-[12px]">{adminBadgeLabel}</span>
                      </Chip>
                    ) : null}
                  </div>
                  <p className="type-caption truncate text-[var(--label-tertiary)]">
                    {accountName}
                  </p>
                </div>
              </div>

              <span
                aria-hidden
                className="profile-menu-chevron flex h-3 w-3 flex-none items-center justify-center text-[var(--separator-strong)]"
              >
                <ProfileMenuChevronIcon />
              </span>
            </div>
          </Dropdown.Item>

          {hideNavigationItems && publicSiteUrl ? (
            <Dropdown.Item
              key="back-to-site"
              id="back-to-site"
              textValue="На главную"
              className="font-normal"
            >
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span aria-hidden className="h-5 w-5 flex-none opacity-0" />
                  <Label className="type-menu-label min-w-0 flex-1 truncate text-[var(--label-primary)]">
                    На главную
                  </Label>
                </div>
                <span
                  aria-hidden
                  className="profile-menu-chevron flex h-3 w-3 flex-none items-center justify-center text-[var(--separator-strong)]"
                >
                  <ProfileMenuChevronIcon />
                </span>
              </div>
            </Dropdown.Item>
          ) : null}
          {hideNavigationItems
            ? null
            : navigationItemsBeforeAdmin.map((item) => (
                <Dropdown.Item
                  key={item.href}
                  id={item.href}
                  textValue={item.label}
                  className="font-normal"
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {"icon" in item && item.icon ? (
                        <span className="flex-none text-[var(--label-tertiary)]">{item.icon}</span>
                      ) : (
                        <span aria-hidden className="h-5 w-5 flex-none opacity-0" />
                      )}
                      <Label className="type-menu-label min-w-0 flex-1 truncate text-[var(--label-primary)]">
                        {item.label}
                      </Label>
                    </div>
                    <span
                      aria-hidden
                      className="profile-menu-chevron flex h-3 w-3 flex-none items-center justify-center text-[var(--separator-strong)]"
                    >
                      <ProfileMenuChevronIcon />
                    </span>
                  </div>
                </Dropdown.Item>
              ))}

          {!hideNavigationItems && canOpenAdminConsole && adminConsoleUrl ? (
            <Dropdown.Item
              key="open-admin-console"
              id="open-admin-console"
              textValue="Админка"
              className="font-normal"
            >
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex-none text-[var(--label-tertiary)]">
                    <AdminShieldIcon />
                  </span>
                  <Label className="type-menu-label min-w-0 flex-1 truncate text-[var(--label-primary)]">
                    Админка
                  </Label>
                </div>
                <span
                  aria-hidden
                  className="profile-menu-chevron flex h-3 w-3 flex-none items-center justify-center text-[var(--separator-strong)]"
                >
                  <ProfileMenuChevronIcon />
                </span>
              </div>
            </Dropdown.Item>
          ) : null}

          {hideNavigationItems
            ? null
            : navigationItemsAfterAdmin.map((item) => (
                <Dropdown.Item
                  key={item.href}
                  id={item.href}
                  textValue={item.label}
                  className="font-normal"
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {"icon" in item && item.icon ? (
                        <span className="flex-none text-[var(--label-tertiary)]">{item.icon}</span>
                      ) : (
                        <span aria-hidden className="h-5 w-5 flex-none opacity-0" />
                      )}
                      <Label className="type-menu-label min-w-0 flex-1 truncate text-[var(--label-primary)]">
                        {item.label}
                      </Label>
                    </div>
                    <span
                      aria-hidden
                      className="profile-menu-chevron flex h-3 w-3 flex-none items-center justify-center text-[var(--separator-strong)]"
                    >
                      <ProfileMenuChevronIcon />
                    </span>
                  </div>
                </Dropdown.Item>
              ))}

          <Dropdown.Item
            key="sign-out"
            id="sign-out"
            textValue={isSigningOut ? "Выходим..." : "Выйти"}
            isDisabled={isSigningOut}
            className="mt-3 font-normal"
          >
            <div className="flex w-full items-center gap-3">
              <span className="flex-none text-[var(--label-tertiary)]">
                <LogOutIcon />
              </span>
              <Label className="type-menu-label min-w-0 flex-1 truncate text-[var(--label-primary)]">
                {isSigningOut ? "Выходим..." : "Выйти"}
              </Label>
            </div>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}
