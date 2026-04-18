import Image from "next/image";
import { AuthorInline } from "@/components/ui/author-inline";
import { buildPublicProfilePathFromHandle } from "@/features/auth/lib/profile";
import { PostActions } from "@/features/feed/components/post-actions";
import type { PostMenuActionId } from "@/features/feed/constants/post-menu";
import { IntentBadge } from "@/features/feed/components/intent-badge";
import { PostMoreMenu } from "@/features/feed/components/post-more-menu";
import type { Post } from "@/features/feed/types";

type CardPostItemProps = {
  post: Post;
  onToggleLike: (postId: Post["id"], liked: boolean) => void;
  onPostMenuAction: (actionId: PostMenuActionId, postId: Post["id"]) => void;
};

export function CardPostItem({
  post,
  onToggleLike,
  onPostMenuAction,
}: CardPostItemProps) {
  return (
    <div className="pointer-events-none flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <AuthorInline
          avatarUrl={post.author.avatarUrl}
          handle={post.author.handle}
          name={post.author.name}
          meta={post.activity.publishedAtLabel}
          profileHref={buildPublicProfilePathFromHandle(post.author.handle)}
          showStatusDot
        />
        <PostMoreMenu post={post} onAction={onPostMenuAction} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <IntentBadge intent={post.intent} />
      </div>

      <div className="flex flex-col gap-2 pl-0.5">
        <h2 className="type-feed-title text-label-primary">
          {post.content.title}
        </h2>

        <p className="type-body-lg text-label-secondary">
          {post.content.excerpt}
        </p>
      </div>

      {post.media?.type === "image" ? (
        <div className="surface-secondary overflow-hidden rounded-2xl">
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
