import Image from "next/image";
import type { ReactNode } from "react";
import { AuthorInline } from "@/components/ui/author-inline";
import { PostHeartIcon } from "@/components/ui/icons";
import { buildPublicProfilePathFromHandle } from "@/features/auth/lib/profile";
import { PostActions } from "@/features/feed/components/post-actions";
import type {
  PostMenuActionId,
  PostMenuActionPayload,
} from "@/features/feed/constants/post-menu";
import { IntentBadge } from "@/features/feed/components/intent-badge";
import { PostMoreMenu } from "@/features/feed/components/post-more-menu";
import type { Post } from "@/features/feed/types";

type CardPostItemProps = {
  post: Post;
  blockPointerEvents?: boolean;
  menuSlot?: ReactNode;
  showReadOnlyLikeCounter?: boolean;
  showActions?: boolean;
  showMenu?: boolean;
  onToggleBookmark: (postId: Post["id"]) => void;
  onToggleLike: (postId: Post["id"], liked: boolean) => void;
  onPostMenuAction: (
    actionId: PostMenuActionId,
    postId: Post["id"],
    payload?: PostMenuActionPayload,
  ) => Promise<void> | void;
  postHref?: string;
};

export function CardPostItem({
  post,
  blockPointerEvents = true,
  menuSlot,
  showReadOnlyLikeCounter = false,
  showActions = true,
  showMenu = true,
  onToggleBookmark,
  onToggleLike,
  onPostMenuAction,
  postHref,
}: CardPostItemProps) {
  const shouldShowIntentBadge = post.author.role !== "specialist";

  return (
    <div className={`${blockPointerEvents ? "pointer-events-none" : ""} flex flex-col gap-3`.trim()}>
      <div className="flex items-center justify-between gap-2">
        <AuthorInline
          avatarUrl={post.author.avatarUrl}
          handle={post.author.handle}
          id={post.author.id ?? null}
          name={post.author.name}
          meta={post.activity.publishedAtLabel}
          compactMeta={post.activity.compactPublishedAtLabel}
          profileHref={buildPublicProfilePathFromHandle(post.author.handle)}
          role={post.author.role}
          specialistStatus={post.author.specialistStatus}
          className="min-w-0 flex-1"
        />
        {showMenu ? menuSlot ?? <PostMoreMenu post={post} onAction={onPostMenuAction} /> : null}
      </div>

      {shouldShowIntentBadge ? (
        <div className="flex flex-wrap items-center gap-2">
          <IntentBadge authorRole={post.author.role} intent={post.intent} />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 pl-0.5">
        <h3 className="type-h3 font-semibold text-label-primary">
          {post.content.title}
        </h3>

        <p className="type-body-lg text-label-primary">
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

      {showActions ? (
        <PostActions
          post={post}
          postHref={postHref}
          onToggleBookmark={onToggleBookmark}
          onToggleLike={onToggleLike}
          className="relative z-10 flex flex-wrap items-center gap-2 pt-1"
        />
      ) : showReadOnlyLikeCounter ? (
        <div
          className="type-body-md inline-flex min-h-7 w-fit items-center gap-1 text-[var(--label-secondary)]"
          aria-label={`Нравится: ${post.stats.likes}`}
        >
          <span className="flex h-5 w-5 flex-none items-center justify-center">
            <PostHeartIcon filled={false} />
          </span>
          <span className="flex items-center leading-5">{post.stats.likes}</span>
        </div>
      ) : null}
    </div>
  );
}
