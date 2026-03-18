import {
  BookmarkIcon,
  ChatIcon,
  HeartIcon,
  ShareIcon,
} from "@/components/ui/icons";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import type { Post } from "@/types/feed";

type PostActionsProps = {
  post: Post;
  className: string;
  onToggleLike: (postId: Post["id"]) => void;
  onToggleBookmark: (postId: Post["id"]) => void;
};

export function PostActions({
  post,
  className,
  onToggleLike,
  onToggleBookmark,
}: PostActionsProps) {
  return (
    <div className={className}>
      <button
        type="button"
        aria-label={post.viewer.liked ? "Больше не нравится" : "Нравится"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleLike(post.id);
        }}
        className={`group/tooltip relative inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
          post.viewer.liked
            ? "bg-[var(--fill-like)] text-[var(--accent-like)] hover:bg-[var(--fill-like-hover)]"
            : "interactive-fill"
        }`}
      >
        <HeartIcon filled={post.viewer.liked} />
        <span>{post.stats.likes}</span>
        <HoverTooltip
          label={post.viewer.liked ? "Больше не нравится" : "Нравится"}
        />
      </button>

      <button
        type="button"
        aria-label="Ответить"
        className="interactive-fill group/tooltip relative inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition"
      >
        <ChatIcon />
        <span>{post.stats.comments}</span>
        <HoverTooltip label="Ответить" />
      </button>

      <button
        type="button"
        aria-label="Поделиться"
        className="interactive-fill group/tooltip relative inline-flex cursor-pointer items-center rounded-full px-3 py-2 text-sm font-medium transition"
      >
        <ShareIcon />
        <HoverTooltip label="Поделиться" />
      </button>

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
        className={`group/tooltip relative inline-flex cursor-pointer items-center rounded-full px-3 py-2 text-sm font-medium transition ${
          post.viewer.bookmarked
            ? "bg-[var(--fill-bookmark)] text-[var(--accent-bookmark)] hover:bg-[var(--fill-bookmark-hover)]"
            : "interactive-fill"
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
