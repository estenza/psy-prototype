"use client";

/* eslint-disable @next/next/no-img-element */

import { getUserAvatarTone } from "@/lib/avatar-tone";

type CommentAvatarProps = {
  avatarUrl: string | null;
  initials: string;
  name: string;
  size: "md" | "sm";
};

const sizeClasses = {
  md: "h-9 w-9 rounded-full text-[12px] font-bold leading-[18px]",
  sm: "h-6 w-6 rounded-full text-[10px] font-semibold leading-4",
};

export function CommentAvatar({
  avatarUrl,
  initials,
  name,
  size,
}: CommentAvatarProps) {
  const className = sizeClasses[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${className} object-cover`.trim()}
      />
    );
  }

  return (
    <div
      className={`${className} ${getUserAvatarTone(name)} inline-flex items-center justify-center`.trim()}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
