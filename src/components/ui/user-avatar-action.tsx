import Link from "next/link";
import type { MouseEventHandler } from "react";
import { UserAvatar } from "@/features/auth/components/user-avatar";

type UserAvatarActionProps = {
  avatarUrl: string | null | undefined;
  avatarSeed?: string | null;
  fallbackText?: string;
  name: string;
  showStatusDot?: boolean;
  size?: "comment-md" | "comment-sm" | "header" | "lg" | "md" | "sm";
  href?: string | null;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
  className?: string;
  interactive?: boolean;
};

const interactiveAvatarBaseClassName = [
  "inline-flex rounded-full p-0 no-highlight pointer-events-auto",
  "transition-transform duration-150 ease-out motion-reduce:transition-none",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
].join(" ");

export function UserAvatarAction({
  avatarUrl,
  avatarSeed,
  fallbackText,
  name,
  showStatusDot = false,
  size = "md",
  href = null,
  onClick,
  ariaLabel,
  className = "",
  interactive = true,
}: UserAvatarActionProps) {
  const interactiveAvatarClassName = `${interactiveAvatarBaseClassName} ${
    size === "header" ? "active:scale-[0.88]" : "active:scale-[0.96]"
  }`;
  const resolvedClassName = `${interactive ? interactiveAvatarClassName : "inline-flex"} ${className}`.trim();
  const avatarNode = (
    <UserAvatar
      avatarUrl={avatarUrl ?? null}
      avatarSeed={avatarSeed}
      fallbackText={fallbackText}
      name={name}
      showStatusDot={showStatusDot}
      size={size}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        className={resolvedClassName}
      >
        {avatarNode}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        className={resolvedClassName}
      >
        {avatarNode}
      </button>
    );
  }

  return (
    <span className={resolvedClassName} aria-hidden={ariaLabel ? undefined : true}>
      {avatarNode}
    </span>
  );
}
