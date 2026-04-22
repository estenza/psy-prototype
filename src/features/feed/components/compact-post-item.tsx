import Image from "next/image";
import { AuthorInline } from "@/components/ui/author-inline";
import { buildPublicProfilePathFromHandle } from "@/features/auth/lib/profile";
import type { PostMenuActionId } from "@/features/feed/constants/post-menu";
import { PostMoreMenu } from "@/features/feed/components/post-more-menu";
import { IntentBadge } from "@/features/feed/components/intent-badge";
import { PostActions } from "@/features/feed/components/post-actions";
import type { Post } from "@/features/feed/types";

type CompactPostItemProps = {
  post: Post;
  onToggleLike: (postId: Post["id"], liked: boolean) => void;
  onPostMenuAction: (actionId: PostMenuActionId, postId: Post["id"]) => void;
};

export function CompactPostItem({
  post,
  onToggleLike,
  onPostMenuAction,
}: CompactPostItemProps) {
  return (
    <div className="pointer-events-none flex gap-4">
      <div className="surface-secondary hidden h-[84px] w-[132px] flex-none overflow-hidden rounded-lg sm:block">
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
        <div className="flex min-h-10 items-center justify-between gap-3">
          <AuthorInline
            avatarUrl={post.author.avatarUrl}
            handle={post.author.handle}
            name={post.author.name}
            meta={post.activity.publishedAtLabel}
            compactMeta={post.activity.compactPublishedAtLabel}
            profileHref={buildPublicProfilePathFromHandle(post.author.handle)}
            showStatusDot={post.viewer.isAuthor}
            className="min-w-0 flex-1"
            metaRowClassName="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0 text-[14px] leading-5"
            handleClassName="text-label-tertiary inline-flex min-w-0 items-center self-center truncate"
            metaClassName="text-label-tertiary inline-flex shrink-0 items-center gap-1.5 self-center"
            afterMeta={(
              <span className="ml-2 inline-flex items-center self-center">
                <IntentBadge intent={post.intent} />
              </span>
            )}
          />
          <PostMoreMenu post={post} onAction={onPostMenuAction} />
        </div>

        <div className="mt-3 flex flex-col gap-2 pl-0.5">
          <h2 className="type-feed-title text-label-primary">
            {post.content.title}
          </h2>

          <p className="type-body-lg text-label-primary">
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
