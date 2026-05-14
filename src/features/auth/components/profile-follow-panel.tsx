"use client";

import { cn } from "@heroui/react";
import { toast } from "@/components/feedback/toast";
import type { ReactNode } from "react";
import { useState } from "react";
import { buttonClassName } from "@/components/ui/button-styles";
import { CheckIndicatorIcon } from "@/components/ui/icons";
import { ProfileTextLink } from "@/components/ui/profile-text-link";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import type { AuthorFollowSummary } from "@/features/auth/types";
import { getRussianPluralLabel } from "@/lib/russian-plural";

type ProfileFollowPanelProps = {
  actionTopClassName?: string;
  children?: ReactNode;
  followedUserId: string;
  initialSummary: AuthorFollowSummary;
  profilePath: string;
  userHandle: string;
  viewerIsOwner: boolean;
};

type AuthorFollowResponse = {
  error?: string;
  follow?: AuthorFollowSummary;
  ok?: boolean;
};

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

export function ProfileFollowPanel({
  actionTopClassName = "top-4 min-[480px]:top-6",
  children,
  followedUserId,
  initialSummary,
  profilePath,
  userHandle,
  viewerIsOwner,
}: ProfileFollowPanelProps) {
  const { runIfAuthorized } = useAuthRequiredAction();
  const [summary, setSummary] = useState(initialSummary);
  const [isPending, setIsPending] = useState(false);

  function applyOptimisticFollow(nextFollowing: boolean) {
    setSummary((currentSummary) => ({
      ...currentSummary,
      followersCount: Math.max(
        0,
        currentSummary.followersCount + (nextFollowing ? 1 : -1),
      ),
      viewerFollowing: nextFollowing,
    }));
  }

  async function handleToggleFollow() {
    if (isPending) {
      return;
    }

    const nextFollowing = !summary.viewerFollowing;
    const previousSummary = summary;

    try {
      await runIfAuthorized(async () => {
        setIsPending(true);
        applyOptimisticFollow(nextFollowing);

        const response = await fetch("/api/follows/authors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            followedUserId,
            following: nextFollowing,
          }),
        });

        const payload = (await response.json().catch(() => null)) as AuthorFollowResponse | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Не удалось обновить подписку.");
        }

        if (payload?.follow) {
          setSummary(payload.follow);
        }

        toast.success(
          nextFollowing
            ? `Вы подписаны на ${userHandle}`
            : `Вы отписались от ${userHandle}`,
        );
      });
    } catch (error) {
      setSummary(previousSummary);
      toast.danger(
        error instanceof Error
          ? error.message
          : "Не удалось обновить подписку.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {children}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
        <ProfileTextLink
          href={`${profilePath}?view=followers`}
          className="text-[16px] leading-6 text-[var(--label-primary)]"
        >
          <span className="font-medium">{summary.followersCount}</span>{" "}
          {getFollowersLabel(summary.followersCount)}
        </ProfileTextLink>
        <ProfileTextLink
          href={`${profilePath}?view=following`}
          className="text-[16px] leading-6 text-[var(--label-primary)]"
        >
          <span className="font-medium">{summary.followingCount}</span>{" "}
          {getFollowingLabel(summary.followingCount)}
        </ProfileTextLink>
      </div>

      {!viewerIsOwner ? (
        <div className={`absolute right-16 z-20 flex min-[480px]:right-[72px] ${actionTopClassName}`}>
          <button
            type="button"
            disabled={isPending}
            onClick={handleToggleFollow}
            className={buttonClassName({
              variant: summary.viewerFollowing ? "secondary" : "primary",
              className: cn(
                "h-9 px-4 text-[14px] font-medium",
                summary.viewerFollowing ? "gap-2" : "",
              ),
            })}
          >
            {summary.viewerFollowing ? (
              <span className="flex h-4 w-4 flex-none items-center justify-center">
                <CheckIndicatorIcon />
              </span>
            ) : null}
            <span>{summary.viewerFollowing ? "Вы подписаны" : "Подписаться"}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
