import type { ReactNode } from "react";
import {
  AuthorProfilePopover,
  type AuthorProfilePopoverUser,
} from "@/components/ui/author-profile-popover";
import { useDrawerNavigation } from "@/components/ui/drawer-navigation-context";
import {
  ProfileTextLink,
  profileTextLinkClassName,
} from "@/components/ui/profile-text-link";
import { VerifiedSpecialistIcon } from "@/components/ui/icons";
import { UserAvatarAction } from "@/components/ui/user-avatar-action";

type AuthorInlineProps = {
  avatarUrl: string | null | undefined;
  handle: string;
  id?: string | null;
  name: string;
  meta: string;
  compactMeta?: string;
  afterMeta?: ReactNode;
  avatarSize?: "comment-md" | "comment-sm" | "header" | "lg" | "md" | "sm";
  isVerifiedSpecialist?: boolean;
  showStatusDot?: boolean;
  role?: "user" | "specialist" | null;
  specialistStatus?: "none" | "pending" | "verified" | "rejected" | "suspended" | null;
  profileHref?: string | null;
  avatarHref?: string | null;
  nameHref?: string | null;
  className?: string;
  metaRowClassName?: string;
  nameClassName?: string;
  handleClassName?: string;
  metaClassName?: string;
};

function getHandleInitial(handle: string, name: string) {
  const normalizedHandle = handle.replace(/^@+/, "").trim();
  const fallbackSource = normalizedHandle || name.trim();

  return fallbackSource.charAt(0).toUpperCase() || "U";
}

export function AuthorInline({
  avatarUrl,
  handle,
  id,
  name,
  meta,
  compactMeta,
  afterMeta,
  avatarSize = "comment-md",
  isVerifiedSpecialist,
  showStatusDot = false,
  role,
  specialistStatus,
  profileHref = null,
  avatarHref,
  nameHref,
  className = "",
  metaRowClassName = "flex min-h-9 min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5",
  nameClassName = "text-label-primary relative z-10 max-w-full break-words text-[14px] leading-5 font-medium",
  handleClassName = "text-label-tertiary max-w-full break-words text-[14px] leading-5",
  metaClassName = "text-label-tertiary flex shrink-0 items-center gap-1.5 text-[14px] leading-5",
}: AuthorInlineProps) {
  const drawerNavigation = useDrawerNavigation();
  const resolvedAvatarHref = avatarHref ?? profileHref;
  const resolvedNameHref = nameHref ?? profileHref;
  const shouldUseDrawerLinks = Boolean(drawerNavigation && profileHref);
  const fallbackText = getHandleInitial(handle, name);
  const shouldShowHandle = role !== "specialist";
  const shouldShowVerifiedBadge = isVerifiedSpecialist
    ?? (role === "specialist" && specialistStatus === "verified");
  const profileCard: AuthorProfilePopoverUser = {
    avatarSeed: handle,
    avatarUrl,
    fallbackText,
    handle,
    id,
    name,
    profileHref: resolvedAvatarHref,
    role: role ?? "user",
    specialistStatus,
  };
  const nameContent = (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="min-w-0 truncate">{name}</span>
      {shouldShowVerifiedBadge ? <VerifiedSpecialistIcon size={16} /> : null}
    </span>
  );

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`.trim()}>
      <UserAvatarAction
        avatarUrl={avatarUrl}
        avatarSeed={handle}
        fallbackText={fallbackText}
        name={name}
        showStatusDot={showStatusDot}
        size={avatarSize}
        href={resolvedAvatarHref}
        profileCard={shouldUseDrawerLinks ? null : profileCard}
        ariaLabel={`Открыть профиль ${name}`}
      />

      <div className={metaRowClassName}>
        {resolvedNameHref && id && !shouldUseDrawerLinks ? (
          <AuthorProfilePopover
            ariaLabel={`Показать профиль ${name}`}
            triggerClassName={`${profileTextLinkClassName} inline-flex items-center appearance-none border-0 bg-transparent text-left font-inherit ${nameClassName}`.trim()}
            user={{
              ...profileCard,
              profileHref: resolvedNameHref,
            }}
          >
            {nameContent}
          </AuthorProfilePopover>
        ) : resolvedNameHref ? (
          <ProfileTextLink
            href={resolvedNameHref}
            className={nameClassName}
          >
            {nameContent}
          </ProfileTextLink>
        ) : (
          <span className={nameClassName}>
            {nameContent}
          </span>
        )}
        {shouldShowHandle ? (
          <span className={handleClassName}>
            {handle}
          </span>
        ) : null}
        <div className={metaClassName}>
          <span aria-hidden="true">•</span>
          {compactMeta ? (
            <>
              <span className="min-[480px]:hidden">{compactMeta}</span>
              <span className="hidden min-[480px]:inline">{meta}</span>
            </>
          ) : (
            <span>{meta}</span>
          )}
        </div>
        {afterMeta}
      </div>
    </div>
  );
}
