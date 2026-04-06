import Image from "next/image";
import type { PostMenuActionId } from "@/features/feed/constants/post-menu";
import { PostMoreMenu } from "@/features/feed/components/post-more-menu";
import { PostContextBadges } from "@/features/feed/components/post-context-badges";
import { PostActions } from "@/features/feed/components/post-actions";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import type { Post } from "@/features/feed/types";

type CompactPostItemProps = {
  post: Post;
  onToggleLike: (postId: Post["id"]) => void;
  onPostMenuAction: (actionId: PostMenuActionId, postId: Post["id"]) => void;
};

export function CompactPostItem({
  post,
  onToggleLike,
  onPostMenuAction,
}: CompactPostItemProps) {
  return (
    <div className="flex gap-4">
      <div className="border-separator surface-secondary hidden h-[84px] w-[132px] flex-none overflow-hidden rounded-lg border sm:block">
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
        <div className="flex flex-col gap-2">
          <div className="flex min-h-10 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <UserAvatar
                avatarUrl={post.author.avatarUrl ?? null}
                name={post.author.name}
                size="comment-md"
              />
              <div className="text-label-tertiary flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0 text-[14px] leading-5">
                <span className="relative z-10 inline-flex min-w-0 items-center self-center truncate cursor-pointer">
                  {post.author.handle}
                </span>
                <span
                  aria-hidden="true"
                  className="inline-flex h-1 w-1 shrink-0 self-center rounded-full bg-[var(--label-tertiary)]"
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

        <div className="mt-3 flex flex-col gap-2 pl-0.5">
          <h2 className="font-helvetica text-label-primary text-[20px] font-semibold leading-6">
            {post.content.title}
          </h2>

          <p className="text-label-secondary text-[16px] leading-6">
            {post.content.excerpt}
          </p>
        </div>

        <PostActions
          post={post}
          onToggleLike={onToggleLike}
          className="relative z-10 mt-4 flex flex-wrap items-center gap-2 pt-1"
        />
      </div>
    </div>
  );
}
