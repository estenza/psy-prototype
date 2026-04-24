"use client";

import { useRouter } from "next/navigation";
import { ToggleButton, cn, toast } from "@heroui/react";
import {
  ChatIcon,
  PostHeartIcon,
  ShareIcon,
} from "@/components/ui/icons";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import type { Post } from "@/features/feed/types";

type PostActionsProps = {
  post: Post;
  className: string;
  onToggleLike: (postId: Post["id"], liked: boolean) => void;
  discussionHref?: string;
};

export function PostActions({
  post,
  className,
  onToggleLike,
  discussionHref,
}: PostActionsProps) {
  const router = useRouter();
  const resolvedDiscussionHref = discussionHref ?? `/discussions/${post.id}`;
  const likedActionClassName =
    "bg-[var(--color-danger-soft)] text-[var(--danger)] hover:bg-[var(--color-danger-soft-hover)] data-[hovered=true]:bg-[var(--color-danger-soft-hover)] active:bg-[var(--color-danger-soft-hover)] data-[pressed=true]:bg-[var(--color-danger-soft-hover)] active:text-[var(--danger)] data-[pressed=true]:text-[var(--danger)]";
  const tertiaryActionClassName =
    "interactive-action-soft type-body-md inline-flex h-9 items-center justify-center rounded-full px-3 font-normal transition-colors active:text-[var(--label-secondary)] data-[pressed=true]:text-[var(--label-secondary)]";
  const tertiaryIconOnlyActionClassName = cn(
    tertiaryActionClassName,
    "button--icon-only w-9 px-0",
  );

  async function handleShare() {
    const discussionUrl = new URL(`/discussions/${post.id}`, window.location.origin).toString();

    try {
      if (navigator.share) {
        await navigator.share({
          title: post.content.title,
          text: post.content.excerpt,
          url: discussionUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(discussionUrl);
      toast.success("Ссылка на обсуждение скопирована.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      toast.danger("Не удалось поделиться ссылкой.");
    }
  }

  return (
    <div
      className={cn(className, "pointer-events-none relative z-20 gap-2")}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <HoverTooltip label={post.viewer.liked ? "Больше не нравится" : "Нравится"}>
        <ToggleButton
          aria-label={post.viewer.liked ? "Больше не нравится" : "Нравится"}
          isSelected={post.viewer.liked}
          onChange={() => onToggleLike(post.id, !post.viewer.liked)}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            tertiaryActionClassName,
            "pointer-events-auto",
            post.stats.likes > 0 ? "gap-2 align-middle" : "button--icon-only w-9 px-0",
            post.viewer.liked
              ? likedActionClassName
              : "",
          )}
        >
          <span className="flex h-5 w-5 flex-none items-center justify-center">
            <PostHeartIcon filled={post.viewer.liked} />
          </span>
          {post.stats.likes > 0 ? (
            <span className="flex items-center leading-5">{post.stats.likes}</span>
          ) : null}
        </ToggleButton>
      </HoverTooltip>

      <HoverTooltip label="Ответить">
        <button
          type="button"
          aria-label="Ответить"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            router.push(resolvedDiscussionHref);
          }}
          className={cn(
            tertiaryActionClassName,
            "pointer-events-auto",
            post.stats.comments > 0 ? "gap-2 align-middle" : "button--icon-only w-9 px-0",
          )}
        >
          <span className="flex h-5 w-5 flex-none items-center justify-center">
            <ChatIcon />
          </span>
          {post.stats.comments > 0 ? (
            <span className="flex items-center leading-5">{post.stats.comments}</span>
          ) : null}
        </button>
      </HoverTooltip>

      <HoverTooltip label="Поделиться">
        <button
          type="button"
          aria-label="Поделиться"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void handleShare();
          }}
          className={cn(tertiaryIconOnlyActionClassName, "pointer-events-auto")}
        >
          <span className="flex h-5 w-5 flex-none items-center justify-center">
            <ShareIcon />
          </span>
        </button>
      </HoverTooltip>
    </div>
  );
}
