import Image from "next/image";
import { MoreIcon } from "@/components/ui/icons";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { PostActions } from "@/features/feed/components/post-actions";
import { getUserAvatarTone } from "@/lib/avatar-tone";
import type { Post } from "@/types/feed";

type CardPostItemProps = {
  post: Post;
  onToggleLike: (postId: Post["id"]) => void;
  onToggleBookmark: (postId: Post["id"]) => void;
};

export function CardPostItem({
  post,
  onToggleLike,
  onToggleBookmark,
}: CardPostItemProps) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        className={`relative z-10 flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full text-sm font-semibold ${getUserAvatarTone(post.author.name)}`}
      >
        {post.author.name.slice(0, 2).toUpperCase()}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex min-h-10 items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-[15px] leading-5">
              <span className="text-label-primary relative z-10 inline-flex items-center self-center cursor-pointer font-semibold transition hover:text-[var(--label-secondary)]">
                {post.author.name}
              </span>
              <span className="text-label-secondary relative z-10 inline-flex items-center self-center cursor-pointer transition hover:text-[var(--label-primary)]">
                {post.author.handle}
              </span>
              <span className="text-label-secondary inline-flex items-center self-center text-[15px] font-black leading-none">
                •
              </span>
              <span className="text-label-secondary inline-flex items-center self-center">
                {post.activity.publishedAtLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label="Еще"
            className="group/tooltip text-label-secondary relative z-10 inline-flex cursor-pointer items-center justify-center self-center rounded-full p-2 transition hover:bg-[var(--fill-control-hover)] hover:text-[var(--label-primary)]"
          >
            <MoreIcon />
            <HoverTooltip label="Еще" />
          </button>
        </div>

        <h2 className="text-label-primary mt-2 text-[20px] font-semibold leading-6">
          {post.content.title}
        </h2>

        <p className="text-label-secondary mt-2 text-[15px] leading-[1.45]">
          {post.content.excerpt}
        </p>

        {post.media?.type === "image" ? (
          <div className="border-separator surface-secondary mt-3 overflow-hidden rounded-2xl border">
            <Image
              src={post.media.src}
              alt={post.media.alt ?? "Изображение в посте"}
              width={1200}
              height={720}
              unoptimized
              className="surface-secondary h-auto w-full object-cover"
            />
          </div>
        ) : null}

        <PostActions
          post={post}
          onToggleLike={onToggleLike}
          onToggleBookmark={onToggleBookmark}
          className="relative z-10 mt-3 flex flex-wrap items-center gap-2"
        />
      </div>
    </div>
  );
}
