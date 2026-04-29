"use client";

import { BookmarkIcon, ChatIcon } from "@/components/ui/icons";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { PostContextBadges } from "@/features/feed/components/post-context-badges";
import type { Post } from "@/features/feed/types";

type ForumPostItemProps = {
  post: Post;
  onToggleBookmark: (postId: Post["id"]) => void;
};

export function ForumPostItem({
  post,
  onToggleBookmark,
}: ForumPostItemProps) {
  return (
    <div className="pointer-events-none flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <PostContextBadges
          intent={post.intent}
          topic={post.topic}
          className="mb-2"
        />
        <h2 className="type-feed-title text-label-primary overflow-hidden text-ellipsis whitespace-nowrap">
          {post.content.title}
        </h2>
        <div className="type-body-md text-label-secondary mt-1.5 flex items-center gap-2">
          <span>Автор:</span>
          <span className="inline-flex items-center gap-2">
            <UserAvatar
              avatarUrl={post.author.avatarUrl ?? null}
              name={post.author.name}
              size="comment-sm"
            />
            <span className="font-medium text-[var(--label-secondary)]">
              {post.author.name}
            </span>
          </span>
        </div>
      </div>

      <div className="w-[96px] shrink-0 text-right min-[481px]:w-[112px]">
        <div className="type-subtitle text-label-secondary">
          {post.activity.lastCommentAtLabel}
        </div>
        <div className="text-label-secondary mt-0.5 hidden text-sm leading-4 min-[481px]:block">
          {post.activity.lastCommentAuthor}
        </div>
      </div>

      <div className="type-subtitle text-label-secondary inline-flex shrink-0 items-center gap-2">
        <ChatIcon />
        <span>{post.stats.comments}</span>
      </div>

      <HoverTooltip
        label={
          post.viewer.bookmarked ? "Убрать из закладок" : "Закладка"
        }
        triggerClassName="pointer-events-auto relative z-30"
      >
        <button
          type="button"
          aria-label={
            post.viewer.bookmarked ? "Убрать из закладок" : "Закладка"
          }
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleBookmark(post.id);
          }}
          className={`post-action-button pointer-events-auto relative z-30 inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full ${
            post.viewer.bookmarked
              ? "interactive-accent-bookmark"
              : "interactive-action-soft"
          }`}
        >
          <BookmarkIcon filled={post.viewer.bookmarked} />
        </button>
      </HoverTooltip>
    </div>
  );
}
