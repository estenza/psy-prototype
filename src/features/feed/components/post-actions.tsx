import Link from "next/link";
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
      <HoverTooltip label={post.viewer.liked ? "Больше не нравится" : "Нравится"}>
        <button
          type="button"
          aria-label={post.viewer.liked ? "Больше не нравится" : "Нравится"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleLike(post.id);
          }}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-normal ${
            post.viewer.liked
              ? "interactive-accent-like"
              : "interactive-toggle-like"
          }`}
        >
          <HeartIcon filled={post.viewer.liked} />
          <span>{post.stats.likes}</span>
        </button>
      </HoverTooltip>

      <HoverTooltip label="Ответить">
        <Link
          href={`/discussions/${post.id}`}
          aria-label="Ответить"
          className="interactive-fill inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-normal"
        >
          <ChatIcon />
          <span>{post.stats.comments}</span>
        </Link>
      </HoverTooltip>

      <HoverTooltip label="Поделиться">
        <button
          type="button"
          aria-label="Поделиться"
          className="interactive-fill inline-flex cursor-pointer items-center rounded-full px-3 py-2 text-sm font-normal"
        >
          <ShareIcon />
        </button>
      </HoverTooltip>
    </div>
  );
}
