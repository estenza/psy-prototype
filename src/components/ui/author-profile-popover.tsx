"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Drawer, Popover, cn } from "@heroui/react";
import type { FocusEvent, MouseEvent, ReactNode } from "react";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { toast } from "@/components/feedback/toast";
import { buttonClassName } from "@/components/ui/button-styles";
import { useDrawerNavigation } from "@/components/ui/drawer-navigation-context";
import { CheckIndicatorIcon, VerifiedSpecialistIcon } from "@/components/ui/icons";
import { ProfileTextLink } from "@/components/ui/profile-text-link";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import { formatUserLastSeenLabel } from "@/features/auth/lib/user-presence";
import type { AuthorFollowSummary } from "@/features/auth/types";
import { useMobileViewport } from "@/hooks/use-mobile-viewport";
import { getRussianPluralLabel } from "@/lib/russian-plural";

export type AuthorProfilePopoverUser = {
  avatarSeed?: string | null;
  avatarUrl: string | null | undefined;
  fallbackText?: string;
  handle: string;
  id?: string | null;
  name: string;
  profileHref?: string | null;
  role?: "user" | "specialist" | null;
  specialistStatus?: "none" | "pending" | "verified" | "rejected" | "suspended" | null;
  updatedAt?: string | null;
};

type ProfileCardPayload = {
  error?: string;
  follow?: AuthorFollowSummary;
  ok?: boolean;
  user?: {
    avatarUrl: string | null;
    handle: string;
    id: string;
    name: string;
    profileDescription: string | null;
    profilePath: string | null;
    role: "user" | "specialist" | null;
    specialistStatus: "none" | "pending" | "verified" | "rejected" | "suspended" | null;
    specialties: string[];
    updatedAt: string;
  };
  viewerIsOwner?: boolean;
};

type AuthorProfilePopoverProps = {
  ariaLabel?: string;
  children: ReactNode;
  triggerClassName?: string;
  user: AuthorProfilePopoverUser;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
    notation: value >= 10_000 ? "compact" : "standard",
  }).format(value);
}

function getFollowersLabel(value: number) {
  return getRussianPluralLabel(value, {
    one: "подписчик",
    few: "подписчика",
    many: "подписчиков",
  });
}

function getFollowingLabel(value: number) {
  return getRussianPluralLabel(value, {
    one: "подписка",
    few: "подписки",
    many: "подписок",
  });
}

const DESKTOP_OPEN_DELAY_MS = 750;
const DESKTOP_CLOSE_DELAY_MS = 260;
const PROFILE_POPOVER_OPEN_EVENT = "vnutri:author-profile-popover-open";
const SPECIALIST_POPOVER_DESCRIPTION_LIMIT = 200;

function truncatePopoverDescription(description: string, maxLength: number) {
  if (description.length <= maxLength) {
    return description;
  }

  return `${description.slice(0, maxLength).trimEnd()}...`;
}

function AuthorProfilePopoverSkeleton() {
  return (
    <div
      className="flex min-h-[220px] flex-col gap-4 p-4"
      aria-busy="true"
      aria-label="Загружаем профиль"
    >
      <div className="flex items-start gap-3">
        <div className="comment-skeleton h-14 w-14 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 pt-1">
          <div className="comment-skeleton h-5 w-36 rounded-full" />
          <div className="comment-skeleton mt-2 h-4 w-28 rounded-full" />
          <div className="comment-skeleton mt-2 h-4 w-24 rounded-full" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="comment-skeleton h-4 w-full rounded-full" />
        <div className="comment-skeleton h-4 w-[88%] rounded-full" />
        <div className="comment-skeleton h-4 w-[62%] rounded-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="comment-skeleton h-7 w-24 rounded-full" />
        <div className="comment-skeleton h-7 w-32 rounded-full" />
        <div className="comment-skeleton h-7 w-20 rounded-full" />
      </div>
      <div className="flex gap-5">
        <div className="comment-skeleton h-5 w-20 rounded-full" />
        <div className="comment-skeleton h-5 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function AuthorProfilePopover({
  ariaLabel,
  children,
  triggerClassName = "",
  user,
}: AuthorProfilePopoverProps) {
  const router = useRouter();
  const drawerNavigation = useDrawerNavigation();
  const popoverId = useId();
  const { runIfAuthorized } = useAuthRequiredAction();
  const isMobileViewport = useMobileViewport();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openTimeoutRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [payload, setPayload] = useState<ProfileCardPayload | null>(null);
  const [follow, setFollow] = useState<AuthorFollowSummary | null>(null);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [shouldLoadProfileCard, setShouldLoadProfileCard] = useState(false);

  const profileUser = payload?.user;
  const isProfileCardLoading = Boolean(isOpen && user.id && !payload && !hasLoadError);
  const viewerIsOwner = Boolean(payload?.viewerIsOwner);
  const profileHref = profileUser?.profilePath ?? user.profileHref ?? null;
  const resolvedAvatarUrl = profileUser?.avatarUrl ?? user.avatarUrl ?? null;
  const resolvedHandle = profileUser?.handle ?? user.handle;
  const resolvedName = profileUser?.name ?? user.name;
  const resolvedRole = profileUser?.role ?? user.role ?? null;
  const resolvedSpecialistStatus = profileUser?.specialistStatus ?? user.specialistStatus ?? null;
  const shouldShowHandle = resolvedRole !== "specialist";
  const resolvedUpdatedAt = profileUser?.updatedAt ?? user.updatedAt ?? null;
  const isVerifiedSpecialist = resolvedRole === "specialist"
    && resolvedSpecialistStatus === "verified";
  const lastSeenLabel = resolvedUpdatedAt
    ? formatUserLastSeenLabel(resolvedUpdatedAt)
    : null;
  const resolvedDescription = profileUser?.profileDescription?.trim() ?? "";
  const visibleDescription = resolvedRole === "specialist"
    ? truncatePopoverDescription(
      resolvedDescription,
      SPECIALIST_POPOVER_DESCRIPTION_LIMIT,
    )
    : resolvedDescription;
  const resolvedSpecialties = profileUser?.specialties ?? [];
  const canFollow = Boolean(profileUser?.id && follow && !viewerIsOwner);

  const triggerLabel = ariaLabel ?? `Показать профиль ${resolvedName}`;

  function openProfileInDrawer(href = profileHref) {
    if (!href || !drawerNavigation) {
      return false;
    }

    closeProfilePopover();
    return drawerNavigation.openHref(href, resolvedName);
  }

  function handleProfileLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!drawerNavigation) {
      closeProfilePopover();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    openProfileInDrawer(event.currentTarget.href);
  }

  function clearDesktopCloseTimeout() {
    if (closeTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  }

  function clearDesktopOpenTimeout() {
    if (openTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(openTimeoutRef.current);
    openTimeoutRef.current = null;
  }

  function notifyProfilePopoverOpen() {
    window.dispatchEvent(
      new CustomEvent(PROFILE_POPOVER_OPEN_EVENT, {
        detail: {
          id: popoverId,
        },
      }),
    );
  }

  function openProfilePopover() {
    clearDesktopOpenTimeout();
    clearDesktopCloseTimeout();
    setShouldLoadProfileCard(true);
    notifyProfilePopoverOpen();
    setIsOpen(true);
  }

  function closeProfilePopover() {
    clearDesktopOpenTimeout();
    clearDesktopCloseTimeout();
    setIsOpen(false);
  }

  function scheduleDesktopPopoverOpen() {
    clearDesktopCloseTimeout();

    if (isOpen || openTimeoutRef.current !== null) {
      return;
    }

    setShouldLoadProfileCard(true);
    openTimeoutRef.current = window.setTimeout(() => {
      openTimeoutRef.current = null;
      openProfilePopover();
    }, DESKTOP_OPEN_DELAY_MS);
  }

  function handleProfilePopoverOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      openProfilePopover();
      return;
    }

    closeProfilePopover();
  }

  function toggleProfilePopover() {
    if (isOpen) {
      closeProfilePopover();
      return;
    }

    openProfilePopover();
  }

  function scheduleDesktopPopoverClose() {
    clearDesktopOpenTimeout();
    clearDesktopCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimeoutRef.current = null;
    }, DESKTOP_CLOSE_DELAY_MS);
  }

  function isMovingWithinCurrentTarget(
    event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>,
  ) {
    return event.relatedTarget instanceof Node
      && event.currentTarget.contains(event.relatedTarget);
  }

  useEffect(() => {
    function handleOtherProfilePopoverOpen(event: Event) {
      const eventDetail = (event as CustomEvent<{ id?: string }>).detail;

      if (eventDetail?.id === popoverId) {
        return;
      }

      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      if (openTimeoutRef.current !== null) {
        window.clearTimeout(openTimeoutRef.current);
        openTimeoutRef.current = null;
      }
      setIsOpen(false);
    }

    window.addEventListener(PROFILE_POPOVER_OPEN_EVENT, handleOtherProfilePopoverOpen);

    return () => {
      window.removeEventListener(PROFILE_POPOVER_OPEN_EVENT, handleOtherProfilePopoverOpen);
    };
  }, [popoverId]);

  useEffect(() => {
    setPayload(null);
    setFollow(null);
    setHasLoadError(false);
    setShouldLoadProfileCard(false);
  }, [user.id]);

  useEffect(() => {
    if (!shouldLoadProfileCard || !user.id || payload || hasLoadError) {
      return;
    }

    const controller = new AbortController();

    async function loadProfileCard() {
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(user.id ?? "")}/profile-card`, {
          signal: controller.signal,
        });
        const nextPayload = (await response.json().catch(() => null)) as ProfileCardPayload | null;

        if (!response.ok || !nextPayload?.user) {
          throw new Error(nextPayload?.error ?? "Не удалось загрузить профиль.");
        }

        setPayload(nextPayload);
        setFollow(nextPayload.follow ?? null);
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setHasLoadError(true);
      }
    }

    void loadProfileCard();

    return () => {
      controller.abort();
    };
  }, [hasLoadError, payload, shouldLoadProfileCard, user.id]);

  useEffect(() => {
    return () => {
      clearDesktopCloseTimeout();
      clearDesktopOpenTimeout();
    };
  }, []);

  async function handleToggleFollow() {
    if (!profileUser?.id || !follow || isFollowPending) {
      return;
    }

    const nextFollowing = !follow.viewerFollowing;
    const previousFollow = follow;

    try {
      await runIfAuthorized(async () => {
        setIsFollowPending(true);
        setFollow({
          ...previousFollow,
          followersCount: Math.max(
            0,
            previousFollow.followersCount + (nextFollowing ? 1 : -1),
          ),
          viewerFollowing: nextFollowing,
        });

        const response = await fetch("/api/follows/authors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            followedUserId: profileUser.id,
            following: nextFollowing,
          }),
        });

        const nextPayload = (await response.json().catch(() => null)) as {
          error?: string;
          follow?: AuthorFollowSummary;
        } | null;

        if (!response.ok) {
          throw new Error(nextPayload?.error ?? "Не удалось обновить подписку.");
        }

        if (nextPayload?.follow) {
          setFollow(nextPayload.follow);
        }

        toast.success(
          nextFollowing
            ? `Вы подписаны на ${shouldShowHandle ? resolvedHandle : resolvedName}`
            : `Вы отписались от ${shouldShowHandle ? resolvedHandle : resolvedName}`,
        );
      });
    } catch (error) {
      setFollow(previousFollow);
      toast.danger(
        error instanceof Error
          ? error.message
          : "Не удалось обновить подписку.",
      );
    } finally {
      setIsFollowPending(false);
    }
  }

  const profileCardContent = isProfileCardLoading ? (
    <AuthorProfilePopoverSkeleton />
  ) : (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {profileHref ? (
            <Link
              href={profileHref}
              aria-label={`Открыть профиль ${resolvedName}`}
              className="inline-flex rounded-full p-0 no-highlight transition-transform duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={handleProfileLinkClick}
            >
              <UserAvatar
                avatarUrl={resolvedAvatarUrl}
                avatarSeed={user.avatarSeed ?? resolvedHandle}
                fallbackText={user.fallbackText}
                name={resolvedName}
                size="popover"
              />
            </Link>
          ) : (
            <UserAvatar
              avatarUrl={resolvedAvatarUrl}
              avatarSeed={user.avatarSeed ?? resolvedHandle}
              fallbackText={user.fallbackText}
              name={resolvedName}
              size="popover"
            />
          )}
          <div className="min-w-0">
            {profileHref ? (
              <ProfileTextLink
                href={profileHref}
                className="author-profile-name-link group text-label-primary inline-flex max-w-full items-center gap-1 text-[16px] leading-5 font-medium"
                onClick={handleProfileLinkClick}
              >
                <span className="author-profile-name-text min-w-0 truncate pb-px transition-shadow duration-100 ease-out">
                  {resolvedName}
                </span>
                {isVerifiedSpecialist ? <VerifiedSpecialistIcon /> : null}
              </ProfileTextLink>
            ) : (
              <div className="text-label-primary inline-flex max-w-full items-center gap-1 text-[16px] leading-5 font-medium">
                <span className="min-w-0 truncate">{resolvedName}</span>
                {isVerifiedSpecialist ? <VerifiedSpecialistIcon /> : null}
              </div>
            )}
            {shouldShowHandle ? (
              <div className="text-label-tertiary mt-0.5 truncate text-[14px] leading-5">
                {resolvedHandle}
              </div>
            ) : null}
            {lastSeenLabel ? (
              <div className="text-label-tertiary mt-0.5 truncate text-[14px] leading-5">
                {lastSeenLabel}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {visibleDescription ? (
        <p className="text-label-secondary whitespace-pre-wrap text-[16px] leading-6">
          {visibleDescription}
        </p>
      ) : null}

      {resolvedRole === "specialist" && resolvedSpecialties.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="text-label-tertiary text-[14px] leading-4">
            Подходы
          </div>
          <div className="flex flex-wrap gap-1.5">
            {resolvedSpecialties.map((specialty) => (
              <span
                key={specialty}
                className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-[14px] leading-4 text-[var(--accent-primary)]"
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {follow ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[16px] leading-5">
          {profileHref ? (
            <ProfileTextLink
              href={`${profileHref}?view=following`}
              className="text-label-secondary"
              onClick={handleProfileLinkClick}
            >
              <span className="text-label-primary font-medium">
                {formatCount(follow.followingCount)}
              </span>{" "}
              {getFollowingLabel(follow.followingCount)}
            </ProfileTextLink>
          ) : (
            <span className="text-label-secondary">
              <span className="text-label-primary font-medium">
                {formatCount(follow.followingCount)}
              </span>{" "}
              {getFollowingLabel(follow.followingCount)}
            </span>
          )}
          {profileHref ? (
            <ProfileTextLink
              href={`${profileHref}?view=followers`}
              className="text-label-secondary"
              onClick={handleProfileLinkClick}
            >
              <span className="text-label-primary font-medium">
                {formatCount(follow.followersCount)}
              </span>{" "}
              {getFollowersLabel(follow.followersCount)}
            </ProfileTextLink>
          ) : (
            <span className="text-label-secondary">
              <span className="text-label-primary font-medium">
                {formatCount(follow.followersCount)}
              </span>{" "}
              {getFollowersLabel(follow.followersCount)}
            </span>
          )}
        </div>
      ) : null}

      {canFollow ? (
        <div className="flex">
          <button
            type="button"
            disabled={isFollowPending}
            onClick={handleToggleFollow}
            className={buttonClassName({
              variant: follow?.viewerFollowing ? "secondary" : "primary",
              size: "s",
              className: cn(
                "shrink-0",
                follow?.viewerFollowing ? "gap-2" : "",
              ),
            })}
          >
            {follow?.viewerFollowing ? (
              <span className="flex h-4 w-4 flex-none items-center justify-center">
                <CheckIndicatorIcon />
              </span>
            ) : null}
            <span>{follow?.viewerFollowing ? "Вы подписаны" : "Подписаться"}</span>
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <Fragment>
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        className={triggerClassName}
        data-interactive="true"
        onMouseOver={(event) => {
          if (isMobileViewport) {
            return;
          }

          if (isMovingWithinCurrentTarget(event)) {
            return;
          }

          scheduleDesktopPopoverOpen();
        }}
        onMouseOut={(event) => {
          if (isMobileViewport) {
            return;
          }

          if (isMovingWithinCurrentTarget(event)) {
            return;
          }

          scheduleDesktopPopoverClose();
        }}
        onFocus={() => {
          if (isMobileViewport) {
            return;
          }

          scheduleDesktopPopoverOpen();
        }}
        onBlur={(event) => {
          if (isMobileViewport) {
            return;
          }

          if (isMovingWithinCurrentTarget(event)) {
            return;
          }

          scheduleDesktopPopoverClose();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!isMobileViewport) {
            if (profileHref) {
              if (!openProfileInDrawer()) {
                closeProfilePopover();
                router.push(profileHref);
              }
            }
            return;
          }

          if (profileHref && openProfileInDrawer()) {
            return;
          }

          toggleProfilePopover();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          if (!isMobileViewport) {
            if (profileHref) {
              if (!openProfileInDrawer()) {
                closeProfilePopover();
                router.push(profileHref);
              }
            } else {
              openProfilePopover();
            }
            return;
          }

          if (profileHref && openProfileInDrawer()) {
            return;
          }

          toggleProfilePopover();
        }}
      >
        {children}
      </button>

      {isMobileViewport ? (
        <Drawer.Root isOpen={isOpen} onOpenChange={handleProfilePopoverOpenChange}>
          <Drawer.Backdrop variant="opaque">
            <Drawer.Content placement="bottom">
              <Drawer.Dialog className="rounded-t-[28px] p-0 pb-[calc(8px+env(safe-area-inset-bottom))] max-[480px]:rounded-t-[16px]">
                <Drawer.Handle />
                <Drawer.Body className="m-0 max-h-[70vh] p-0">
                  {profileCardContent}
                </Drawer.Body>
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
        </Drawer.Root>
      ) : (
        <Popover.Content
          isOpen={isOpen}
          offset={8}
          onOpenChange={handleProfilePopoverOpenChange}
          placement="bottom start"
          triggerRef={triggerRef}
          isNonModal
          onMouseEnter={openProfilePopover}
          onMouseLeave={scheduleDesktopPopoverClose}
          className="author-profile-popover w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-[24px] border-0 bg-[var(--background-elevated)] p-0 shadow-[0_18px_48px_rgba(0,0,0,0.18)]"
        >
          <Popover.Dialog className="outline-none">
            {profileCardContent}
          </Popover.Dialog>
        </Popover.Content>
      )}
    </Fragment>
  );
}
