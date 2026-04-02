"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { ROLE_LABELS } from "@/features/auth/constants";
import { getUserHandle } from "@/features/auth/lib/profile";
import { dispatchAuthStateChanged } from "@/features/auth/hooks/use-current-user";
import { getUserAvatarTone } from "@/lib/avatar-tone";

type AuthStatusProps = {
  compact?: boolean;
};

function AvatarBadge({
  initials,
  toneClass,
}: {
  initials: string;
  toneClass: string;
}) {
  return (
    <div
      className={`relative inline-flex h-11 w-11 flex-none items-center justify-center rounded-full text-sm font-semibold ${toneClass}`}
    >
      {initials}
      <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-[var(--background-primary)] bg-[var(--accent-success)]" />
    </div>
  );
}

function getInitials(displayName: string) {
  const parts = displayName.split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "U";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function AuthStatus({ compact = false }: AuthStatusProps) {
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
      <div className="flex items-center gap-2">
        <div className="bg-[color-mix(in_srgb,var(--label-primary)_10%,transparent)] h-11 w-24 animate-pulse rounded-full" />
        <div className="bg-[color-mix(in_srgb,var(--label-primary)_10%,transparent)] h-11 w-11 animate-pulse rounded-full" />
      </div>
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

  const initials = getInitials(user.displayName);
  const toneClass = getUserAvatarTone(user.displayName);
  const secondaryLabel = [getUserHandle(user), ROLE_LABELS[user.role], user.isModerator ? "moderator" : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-3">
      {!compact ? (
        <div className="hidden min-w-0 flex-col items-end xl:flex">
          <span className="truncate text-sm font-semibold text-[var(--label-primary)]">
            {user.displayName}
          </span>
          <span className="text-[12px] leading-4 text-[var(--label-secondary)]">
            {secondaryLabel}
          </span>
        </div>
      ) : null}

      {!compact ? (
        <Button
          variant="ghost"
          size="sm"
          className="!rounded-full !px-4 !py-2 text-[13px] font-semibold"
          disabled={isSigningOut}
          onClick={handleSignOut}
        >
          {isSigningOut ? "Выходим..." : "Выйти"}
        </Button>
      ) : null}

      {!compact && user.isModerator ? (
        <Link
          href="/admin/users"
          className="interactive-control inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold"
        >
          Admin
        </Link>
      ) : null}

      <AvatarBadge
        initials={initials}
        toneClass={toneClass}
      />
    </div>
  );
}
