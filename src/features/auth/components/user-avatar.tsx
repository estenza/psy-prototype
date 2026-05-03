"use client";

import { Avatar } from "@heroui/react";
import { useState } from "react";
import { buildGeneratedAvatarUrl } from "@/lib/dicebear-avatar";
import { getUserAvatarTone } from "@/lib/avatar-tone";

type UserAvatarProps = {
  avatarUrl: string | null;
  avatarSeed?: string | null;
  fallbackText?: string;
  name: string;
  showStatusDot?: boolean;
  size?: "comment-md" | "comment-sm" | "header" | "lg" | "md" | "menu" | "profile-xl" | "sm";
  outerBorderClassName?: string;
  useGeneratedFallback?: boolean;
};

const avatarSizeClasses = {
  header: "type-avatar-header h-9 w-9 shrink-0 rounded-full",
  lg: "type-avatar-lg h-20 w-20 shrink-0 rounded-full",
  md: "type-avatar-md h-11 w-11 shrink-0 rounded-full",
  menu: "type-avatar-header h-8 w-8 shrink-0 rounded-full",
  "profile-xl": "h-28 w-28 shrink-0 rounded-full text-[28px] min-[481px]:h-[136px] min-[481px]:w-[136px] min-[481px]:text-[34px]",
  sm: "type-avatar-sm h-10 w-10 shrink-0 rounded-full lg:h-11 lg:w-11 lg:text-sm",
  "comment-md": "type-avatar-comment-md h-9 w-9 shrink-0 rounded-full",
  "comment-sm": "type-avatar-comment-sm h-6 w-6 shrink-0 rounded-full",
};

const statusDotClasses = {
  header: "bottom-0 right-0 h-2.5 w-2.5 border",
  lg: "bottom-1 right-1 h-3.5 w-3.5 border-2",
  md: "bottom-0.5 right-0.5 h-2.5 w-2.5 border",
  menu: "bottom-0 right-0 h-2.5 w-2.5 border",
  "profile-xl": "bottom-2 right-2 h-5 w-5 border-2",
  sm: "bottom-0.5 right-0.5 h-2.5 w-2.5 border",
  "comment-md": "bottom-0 right-0 h-2.5 w-2.5 border",
  "comment-sm": "bottom-0 right-0 h-2.5 w-2.5 border",
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
  avatarSeed,
  fallbackText,
  name,
  outerBorderClassName,
  showStatusDot = false,
  size = "md",
  useGeneratedFallback = true,
}: UserAvatarProps) {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const avatarClassName = avatarSizeClasses[size];
  const statusDotClassName = statusDotClasses[size];
  const initials = fallbackText?.trim() || getUserInitials(name);
  const uploadedAvatarUrl = avatarUrl?.trim() || null;
  const generatedAvatarUrl = useGeneratedFallback
    ? buildGeneratedAvatarUrl(avatarSeed?.trim() || name)
    : null;
  const resolvedAvatarUrl =
    uploadedAvatarUrl && uploadedAvatarUrl !== failedAvatarUrl
      ? uploadedAvatarUrl
      : (generatedAvatarUrl !== failedAvatarUrl ? generatedAvatarUrl : null);
  const shouldShowImage = Boolean(resolvedAvatarUrl);
  const fallbackClassName = shouldShowImage
    ? "bg-[var(--surface-secondary)] text-transparent"
    : `${getUserAvatarTone(name)} inline-flex items-center justify-center`;

  return (
    <span className="relative inline-flex flex-none">
      <Avatar.Root
        className={`${avatarClassName} ${outerBorderClassName ?? ""}`.trim()}
      >
        {shouldShowImage ? (
          <Avatar.Image
            src={resolvedAvatarUrl ?? undefined}
            alt={name}
            className="pointer-events-none select-none object-cover"
            loading="eager"
            draggable={false}
            onError={() => setFailedAvatarUrl(resolvedAvatarUrl)}
          />
        ) : null}
        <Avatar.Fallback className={fallbackClassName}>
          {shouldShowImage ? null : initials}
        </Avatar.Fallback>
      </Avatar.Root>

      {showStatusDot ? (
        <span
          className={`${statusDotClassName} absolute rounded-full border-[var(--background-primary)] bg-[var(--success)]`.trim()}
        />
      ) : null}
    </span>
  );
}
