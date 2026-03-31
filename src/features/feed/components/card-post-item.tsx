import Image from "next/image";
import { PostActions } from "@/features/feed/components/post-actions";
import type { PostMenuActionId } from "@/features/feed/constants/post-menu";
import { PostContextBadges } from "@/features/feed/components/post-context-badges";
import { PostMoreMenu } from "@/features/feed/components/post-more-menu";
import { getUserAvatarTone } from "@/lib/avatar-tone";
import type { Post } from "@/features/feed/types";

type CardPostItemProps = {
  post: Post;
  onToggleLike: (postId: Post["id"]) => void;
  onPostMenuAction: (actionId: PostMenuActionId, postId: Post["id"]) => void;
};

export function CardPostItem({
  post,
  onToggleLike,
  onPostMenuAction,
}: CardPostItemProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex min-h-10 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className={`relative z-10 flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full text-[11px] font-semibold leading-4 ${getUserAvatarTone(post.author.name)}`}
            >
              {post.author.name.slice(0, 2).toUpperCase()}
            </button>
            <div className="text-label-tertiary flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0 text-[14px] leading-5">
              <span className="relative z-10 inline-flex min-w-0 items-center self-center truncate cursor-pointer">
                {post.author.handle}
              </span>
              <span
                aria-hidden="true"
                className="inline-flex h-[3px] w-[3px] shrink-0 self-center rounded-full bg-[var(--label-tertiary)]"
              />
              <span className="inline-flex items-center self-center">
                {post.activity.publishedAtLabel}
              </span>
            </div>
          </div>
          <PostMoreMenu post={post} onAction={onPostMenuAction} />
        </div>

        <PostContextBadges intent={post.intent} topic={post.topic} />
      </div>

      <div className="flex flex-col gap-2 pl-0.5">
        <h2 className="font-helvetica text-label-primary text-[20px] font-semibold leading-6">
          {post.content.title}
        </h2>

        <p className="text-label-secondary text-[16px] leading-[1.45]">
          {post.content.excerpt}
        </p>
      </div>

      {post.media?.type === "image" ? (
        <div className="border-separator surface-secondary overflow-hidden rounded-2xl border">
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
        className="relative z-10 flex flex-wrap items-center gap-2 pt-1"
      />
    </div>
  );
}
