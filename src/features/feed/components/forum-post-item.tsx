"use client";

import { cn } from "@heroui/react";
import { buttonClassName } from "@/components/ui/button-styles";
import { BookmarkIcon, ChatIcon, VerifiedSpecialistIcon } from "@/components/ui/icons";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { UserAvatarAction } from "@/components/ui/user-avatar-action";
import { buildPublicProfilePathFromHandle } from "@/features/auth/lib/profile";
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
  const isVerifiedSpecialist = post.author.role === "specialist"
    && post.author.specialistStatus === "verified";

  return (
    <div className="pointer-events-none flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <PostContextBadges
          authorRole={post.author.role}
          intent={post.intent}
          topic={post.topic}
          className="mb-2"
        />
        <h3 className="type-h3 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-label-primary">
          {post.content.title}
        </h3>
        <div className="type-body-md text-label-secondary mt-1.5 flex items-center gap-2">
          <span>Автор:</span>
          <span className="inline-flex items-center gap-2">
            <UserAvatarAction
              avatarUrl={post.author.avatarUrl ?? null}
              avatarSeed={post.author.handle}
              fallbackText={post.author.name.charAt(0).toUpperCase()}
              href={buildPublicProfilePathFromHandle(post.author.handle)}
              name={post.author.name}
              profileCard={{
                avatarSeed: post.author.handle,
                avatarUrl: post.author.avatarUrl ?? null,
                fallbackText: post.author.name.charAt(0).toUpperCase(),
                handle: post.author.handle,
                id: post.author.id ?? null,
                name: post.author.name,
                profileHref: buildPublicProfilePathFromHandle(post.author.handle),
                role: post.author.role,
                specialistStatus: post.author.specialistStatus,
              }}
              size="comment-sm"
            />
            <span className="inline-flex min-w-0 items-center gap-1 font-medium text-[var(--label-secondary)]">
              <span className="min-w-0 truncate">{post.author.name}</span>
              {isVerifiedSpecialist ? <VerifiedSpecialistIcon size={16} /> : null}
            </span>
          </span>
        </div>
      </div>

      <div className="w-[96px] shrink-0 text-right min-[480px]:w-[112px]">
        <div className="type-subtitle text-label-secondary">
          {post.activity.lastCommentAtLabel}
        </div>
        <div className="text-label-secondary mt-0.5 hidden text-sm leading-4 min-[480px]:block">
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
          className={cn(
            buttonClassName({
              className: "post-action-button pointer-events-auto relative z-30 flex-none",
              isIconOnly: true,
              size: "s",
              variant: "tertiary-accent",
            }),
            post.viewer.bookmarked ? "interactive-accent-bookmark" : "",
          )}
        >
          <BookmarkIcon filled={post.viewer.bookmarked} />
        </button>
      </HoverTooltip>
    </div>
  );
}
