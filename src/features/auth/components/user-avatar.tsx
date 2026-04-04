/* eslint-disable @next/next/no-img-element */

import { getUserAvatarTone } from "@/lib/avatar-tone";

type UserAvatarProps = {
  avatarUrl: string | null;
  name: string;
  showStatusDot?: boolean;
  size?: "lg" | "md";
};

const avatarSizeClasses = {
  lg: "h-20 w-20 rounded-full text-[24px] font-bold",
  md: "h-11 w-11 rounded-full text-sm font-semibold",
};

const statusDotClasses = {
  lg: "bottom-1 right-1 h-3.5 w-3.5 border-2",
  md: "bottom-0.5 right-0.5 h-2.5 w-2.5 border",
};

export function getUserInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "U";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function UserAvatar({
  avatarUrl,
  name,
  showStatusDot = false,
  size = "md",
}: UserAvatarProps) {
  const avatarClassName = avatarSizeClasses[size];
  const statusDotClassName = statusDotClasses[size];
  const initials = getUserInitials(name);

  return (
    <span className="relative inline-flex flex-none">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${avatarClassName} object-cover`.trim()}
        />
      ) : (
        <span
          className={`${avatarClassName} ${getUserAvatarTone(name)} inline-flex items-center justify-center`.trim()}
          aria-hidden="true"
        >
          {initials}
        </span>
      )}

      {showStatusDot ? (
        <span
          className={`${statusDotClassName} absolute rounded-full border-[var(--background-primary)] bg-[var(--accent-success)]`.trim()}
        />
      ) : null}
    </span>
  );
}
