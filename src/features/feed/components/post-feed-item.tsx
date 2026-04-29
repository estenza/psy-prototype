import { CardPostItem } from "@/features/feed/components/card-post-item";
import { CompactPostItem } from "@/features/feed/components/compact-post-item";
import type { PostMenuActionId } from "@/features/feed/constants/post-menu";
import type { Post, ViewMode } from "@/features/feed/types";

type PostFeedItemProps = {
  onPostMenuAction: (actionId: PostMenuActionId, postId: Post["id"]) => Promise<void> | void;
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
  if (viewMode === "compact") {
    return (
      <CompactPostItem
        post={post}
        postHref={postHref}
        onToggleBookmark={onToggleBookmark}
        onToggleLike={onToggleLike}
        onPostMenuAction={onPostMenuAction}
      />
    );
  }

  return (
    <CardPostItem
      post={post}
      postHref={postHref}
      onToggleBookmark={onToggleBookmark}
      onToggleLike={onToggleLike}
      onPostMenuAction={onPostMenuAction}
    />
  );
}
