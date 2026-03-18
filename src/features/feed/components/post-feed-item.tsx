import type { Post, ViewMode } from "@/types/feed";
import { CardPostItem } from "@/features/feed/components/card-post-item";
import { CompactPostItem } from "@/features/feed/components/compact-post-item";
import { ForumPostItem } from "@/features/feed/components/forum-post-item";

type PostFeedItemProps = {
  post: Post;
  viewMode: ViewMode;
  onToggleLike: (postId: Post["id"]) => void;
  onToggleBookmark: (postId: Post["id"]) => void;
};

export function PostFeedItem({
  post,
  viewMode,
  onToggleLike,
  onToggleBookmark,
}: PostFeedItemProps) {
  if (viewMode === "forum") {
    return (
      <ForumPostItem post={post} onToggleBookmark={onToggleBookmark} />
    );
  }

  if (viewMode === "compact") {
    return (
      <CompactPostItem
        post={post}
        onToggleLike={onToggleLike}
        onToggleBookmark={onToggleBookmark}
      />
    );
  }

  return (
    <CardPostItem
      post={post}
      onToggleLike={onToggleLike}
      onToggleBookmark={onToggleBookmark}
    />
  );
}
