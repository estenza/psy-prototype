import { BookmarkIcon, ChatIcon } from "@/components/ui/icons";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
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
    <div className="flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <PostContextBadges
          intent={post.intent}
          topic={post.topic}
          className="mb-2"
        />
        <h2 className="font-helvetica text-label-primary overflow-hidden text-ellipsis whitespace-nowrap text-[20px] font-semibold leading-6">
          {post.content.title}
        </h2>
        <div className="text-label-secondary mt-1.5 flex items-center gap-2 text-[14px] leading-5">
          <span>Автор:</span>
          <span className="font-medium text-[var(--label-secondary)]">
            {post.author.name}
          </span>
        </div>
      </div>

      <div className="w-[96px] shrink-0 text-right sm:w-[112px]">
        <div className="text-label-secondary text-[16px] font-semibold leading-5">
          {post.activity.lastCommentAtLabel}
        </div>
        <div className="text-label-secondary mt-0.5 hidden text-[14px] leading-4 sm:block">
          {post.activity.lastCommentAuthor}
        </div>
      </div>

      <div className="text-label-secondary inline-flex shrink-0 items-center gap-2 text-[16px] font-semibold">
        <ChatIcon />
        <span>{post.stats.comments}</span>
      </div>

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
        className={`group/tooltip relative z-10 inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full ${
          post.viewer.bookmarked
            ? "interactive-accent-bookmark"
            : "interactive-toggle-bookmark-plain"
        }`}
      >
        <BookmarkIcon filled={post.viewer.bookmarked} />
        <HoverTooltip
          label={
            post.viewer.bookmarked ? "Убрать из закладок" : "Закладка"
          }
        />
      </button>
    </div>
  );
}
