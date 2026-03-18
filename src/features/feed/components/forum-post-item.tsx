import { BookmarkIcon, ChatIcon } from "@/components/ui/icons";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import type { Post } from "@/types/feed";

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
        <h2 className="text-label-primary overflow-hidden text-ellipsis whitespace-nowrap text-[18px] font-semibold leading-[1.2]">
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
        <div className="text-label-secondary text-[15px] font-semibold leading-5">
          {post.activity.lastCommentAtLabel}
        </div>
        <div className="text-label-secondary mt-0.5 hidden text-[14px] leading-[1.25] sm:block">
          {post.activity.lastCommentAuthor}
        </div>
      </div>

      <div className="text-label-secondary inline-flex shrink-0 items-center gap-2 text-[15px] font-semibold">
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
        className={`group/tooltip relative z-10 inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full transition ${
          post.viewer.bookmarked
            ? "bg-[var(--fill-bookmark)] text-[var(--accent-bookmark)] hover:bg-[var(--fill-bookmark-hover)]"
            : "text-[var(--label-secondary)] hover:bg-[var(--fill-secondary)] hover:text-[var(--label-primary)]"
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
