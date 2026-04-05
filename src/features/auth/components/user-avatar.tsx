/* eslint-disable @next/next/no-img-element */

import { getUserAvatarTone } from "@/lib/avatar-tone";

type UserAvatarProps = {
  avatarUrl: string | null;
  fallbackText?: string;
  name: string;
  showStatusDot?: boolean;
  size?: "comment-md" | "comment-sm" | "lg" | "md" | "sm";
};

const avatarSizeClasses = {
  lg: "h-20 w-20 shrink-0 rounded-full text-[24px] font-bold",
  md: "h-11 w-11 shrink-0 rounded-full text-sm font-semibold",
  sm: "h-10 w-10 shrink-0 rounded-full text-[13px] font-semibold lg:h-11 lg:w-11 lg:text-sm",
  "comment-md": "h-9 w-9 shrink-0 rounded-full text-[12px] font-bold leading-[18px]",
  "comment-sm": "h-6 w-6 shrink-0 rounded-full text-[10px] font-semibold leading-4",
};

const statusDotClasses = {
  lg: "bottom-1 right-1 h-3.5 w-3.5 border-2",
  md: "bottom-0.5 right-0.5 h-2.5 w-2.5 border",
  sm: "bottom-0.5 right-0.5 h-2.5 w-2.5 border",
  "comment-md": "bottom-0.5 right-0.5 h-2.5 w-2.5 border",
  "comment-sm": "bottom-0.5 right-0.5 h-2.5 w-2.5 border",
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
  fallbackText,
  name,
  showStatusDot = false,
  size = "md",
}: UserAvatarProps) {
  const avatarClassName = avatarSizeClasses[size];
  const statusDotClassName = statusDotClasses[size];
  const initials = fallbackText?.trim() || getUserInitials(name);

  return (
    <span className="relative inline-flex flex-none">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${avatarClassName} block object-cover`.trim()}
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
