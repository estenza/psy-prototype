"use client";

import { CardPostItem } from "@/features/feed/components/card-post-item";
import { CompactPostItem } from "@/features/feed/components/compact-post-item";
import type {
  PostMenuActionId,
  PostMenuActionPayload,
} from "@/features/feed/constants/post-menu";
import { usePostViewTracker } from "@/features/feed/hooks/use-post-view-tracker";
import type { Post, ViewMode } from "@/features/feed/types";

type PostFeedItemProps = {
  onPostMenuAction: (
    actionId: PostMenuActionId,
    postId: Post["id"],
    payload?: PostMenuActionPayload,
  ) => Promise<void> | void;
  post: Post;
  viewMode: ViewMode;
  onToggleBookmark: (postId: Post["id"]) => void;
  onToggleLike: (postId: Post["id"], liked: boolean) => void;
  postHref?: string;
};

export function PostFeedItem({
  onPostMenuAction,
  post,
  viewMode,
  onToggleBookmark,
  onToggleLike,
  postHref,
}: PostFeedItemProps) {
  const viewTrackerRef = usePostViewTracker<HTMLDivElement>(post.id);

  if (viewMode === "compact") {
    return (
      <div ref={viewTrackerRef}>
        <CompactPostItem
          post={post}
          postHref={postHref}
          onToggleBookmark={onToggleBookmark}
          onToggleLike={onToggleLike}
          onPostMenuAction={onPostMenuAction}
        />
      </div>
    );
  }

  return (
    <div ref={viewTrackerRef}>
      <CardPostItem
        post={post}
        postHref={postHref}
        onToggleBookmark={onToggleBookmark}
        onToggleLike={onToggleLike}
        onPostMenuAction={onPostMenuAction}
      />
    </div>
  );
}
