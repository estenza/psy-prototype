"use client";

import Link from "next/link";
import { cn, toast } from "@heroui/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { buttonClassName } from "@/components/ui/button-styles";
import { CheckIndicatorIcon } from "@/components/ui/icons";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import type { AuthorFollowSummary } from "@/features/auth/types";

type ProfileFollowPanelProps = {
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

const profileMetaLinkClassName =
  "rounded-none p-0 no-underline transition-[text-decoration-color] duration-100 ease-out hover:underline focus-visible:underline decoration-[color:var(--underline-primary)] decoration-[1.5px] underline-offset-4";

export function ProfileFollowPanel({
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
        <Link
          href={`${profilePath}?view=followers`}
          className={`${profileMetaLinkClassName} text-[16px] leading-6 text-[var(--label-primary)]`.trim()}
        >
          <span className="font-medium">{summary.followersCount}</span> подписчиков
        </Link>
        <Link
          href={`${profilePath}?view=following`}
          className={`${profileMetaLinkClassName} text-[16px] leading-6 text-[var(--label-primary)]`.trim()}
        >
          <span className="font-medium">{summary.followingCount}</span> подписок
        </Link>
      </div>

      {!viewerIsOwner ? (
        <div className="absolute right-16 top-4 z-20 flex min-[481px]:right-[72px] min-[481px]:top-6">
          <button
            type="button"
            disabled={isPending}
            onClick={handleToggleFollow}
            className={buttonClassName({
              variant: summary.viewerFollowing ? "secondary" : "primary",
              className: cn(
                "h-9 px-4 text-[15px] font-medium",
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
