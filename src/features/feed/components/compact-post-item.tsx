import Image from "next/image";
import { MoreIcon } from "@/components/ui/icons";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { PostActions } from "@/features/feed/components/post-actions";
import { getUserAvatarTone } from "@/lib/avatar-tone";
import type { Post } from "@/types/feed";

type CompactPostItemProps = {
  post: Post;
  onToggleLike: (postId: Post["id"]) => void;
  onToggleBookmark: (postId: Post["id"]) => void;
};

export function CompactPostItem({
  post,
  onToggleLike,
  onToggleBookmark,
}: CompactPostItemProps) {
  return (
    <div className="flex gap-4">
      <div className="border-separator surface-secondary hidden h-[84px] w-[132px] flex-none overflow-hidden rounded-[7px] border sm:block">
        {post.media?.type === "image" ? (
          <Image
            src={post.media.src}
            alt={post.media.alt ?? "Изображение в посте"}
            width={264}
            height={336}
            unoptimized
            className="surface-secondary h-full w-full object-cover"
          />
        ) : (
          <div className="surface-secondary h-full w-full" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-h-10 items-center gap-3">
          <button
            type="button"
            className={`relative z-10 flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full text-sm font-semibold ${getUserAvatarTone(post.author.name)}`}
          >
            {post.author.name.slice(0, 2).toUpperCase()}
          </button>
          <div className="min-w-0 flex-1 self-center">
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

        <h2 className="text-label-primary mt-2 text-[18px] font-semibold leading-[1.15]">
          {post.content.title}
        </h2>

        <p className="text-label-secondary mt-1.5 text-[15px] leading-[1.4]">
          {post.content.excerpt}
        </p>

        <PostActions
          post={post}
          onToggleLike={onToggleLike}
          onToggleBookmark={onToggleBookmark}
          className="relative z-10 mt-2.5 flex flex-wrap items-center gap-2"
        />
      </div>
    </div>
  );
}
