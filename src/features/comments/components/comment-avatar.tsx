"use client";

import { UserAvatar } from "@/features/auth/components/user-avatar";

type CommentAvatarProps = {
  avatarUrl: string | null;
  handle: string;
  name: string;
  size: "md" | "sm";
};

function getHandleInitial(handle: string, name: string) {
  const normalizedHandle = handle.replace(/^@+/, "").trim();
  const fallbackSource = normalizedHandle || name.trim();

  return fallbackSource.charAt(0).toUpperCase() || "U";
}

export function CommentAvatar({
  avatarUrl,
  handle,
  name,
  size,
}: CommentAvatarProps) {
  return (
    <UserAvatar
      avatarUrl={avatarUrl}
      fallbackText={getHandleInitial(handle, name)}
      name={name}
      size={size === "sm" ? "comment-sm" : "comment-md"}
    />
  );
}
