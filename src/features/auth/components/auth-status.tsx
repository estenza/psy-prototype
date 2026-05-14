"use client";

import { buttonClassName } from "@/components/ui/button-styles";
import { UserAvatarAction } from "@/components/ui/user-avatar-action";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { buildOwnProfilePath } from "@/features/auth/lib/profile";

type AuthStatusProps = {
  compact?: boolean;
};

function UnauthorizedProfileIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14 5C16.8995 5 19.25 7.3505 19.25 10.25C19.25 13.1495 16.8995 15.5 14 15.5C11.1005 15.5 8.75 13.1495 8.75 10.25C8.75 7.3505 11.1005 5 14 5ZM14 6.5C11.9289 6.5 10.25 8.17893 10.25 10.25C10.25 12.3211 11.9289 14 14 14C16.0711 14 17.75 12.3211 17.75 10.25C17.75 8.17893 16.0711 6.5 14 6.5Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14 1.25C21.0416 1.25 26.75 6.95837 26.75 14C26.75 21.0416 21.0416 26.75 14 26.75C6.95837 26.75 1.25 21.0416 1.25 14C1.25 6.95837 6.95837 1.25 14 1.25ZM12.0762 18.5C9.58274 18.5001 7.27909 19.7799 5.95703 21.8623C7.99957 23.9515 10.8474 25.25 14 25.25C17.1523 25.25 19.9995 23.9512 22.042 21.8623C20.7199 19.7802 18.4171 18.5001 15.9238 18.5H12.0762ZM14 2.75C7.7868 2.75 2.75 7.7868 2.75 14C2.75 16.5007 3.56715 18.8099 4.94727 20.6777C6.57394 18.39 9.22179 17.0001 12.0762 17H15.9238C18.778 17.0001 21.4251 18.3902 23.0518 20.6777C24.4321 18.8098 25.25 16.5009 25.25 14C25.25 7.7868 20.2132 2.75 14 2.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AuthStatus({
  compact = false,
}: AuthStatusProps) {
  const { openAuthModal, status, user } = useAuthClient();

  if (status === "loading") {
    return (
      <div
        className={`bg-[var(--fill-control-subtle-hover)] animate-pulse rounded-full ${
          compact ? "h-9 w-9" : "h-10 w-10"
        }`}
      />
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        aria-label="Войти"
        onClick={() => openAuthModal()}
        className={buttonClassName({
          className: "flex-none bg-transparent text-[var(--label-primary)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--accent-primary)]",
          isIconOnly: true,
          size: "sm",
          variant: "quaternary",
        })}
      >
        <UnauthorizedProfileIcon />
      </button>
    );
  }

  return (
    <UserAvatarAction
      avatarUrl={user.avatarUrl}
      avatarSeed={user.nickname || user.id}
      ariaLabel="Открыть профиль"
      href={buildOwnProfilePath(user) ?? "/profile"}
      interactive
      name={user.displayName}
      showStatusDot={false}
      size={compact ? "header" : "md"}
    />
  );
}
