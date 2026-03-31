import {
  ChatIcon,
  HeartIcon,
  ShareIcon,
} from "@/components/ui/icons";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import type { Post } from "@/features/feed/types";

type PostActionsProps = {
  post: Post;
  className: string;
  onToggleLike: (postId: Post["id"]) => void;
};

export function PostActions({
  post,
  className,
  onToggleLike,
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
        className={`group/tooltip relative inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-normal ${
          post.viewer.liked
            ? "interactive-accent-like"
            : "interactive-toggle-like"
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
        className="interactive-fill group/tooltip relative inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-normal"
      >
        <ChatIcon />
        <span>{post.stats.comments}</span>
        <HoverTooltip label="Ответить" />
      </button>

      <button
        type="button"
        aria-label="Поделиться"
        className="interactive-fill group/tooltip relative inline-flex cursor-pointer items-center rounded-full px-3 py-2 text-sm font-normal"
      >
        <ShareIcon />
        <HoverTooltip label="Поделиться" />
      </button>
    </div>
  );
}
