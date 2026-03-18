"use client";

import { useState } from "react";
import { DEFAULT_VIEW_MODE } from "@/constants/feed";
import type { Post, ViewMode } from "@/types/feed";

type UseFeedOptions = {
  initialPosts: Post[];
  initialViewMode?: ViewMode;
};

export function useFeed({
  initialPosts,
  initialViewMode = DEFAULT_VIEW_MODE,
}: UseFeedOptions) {
  const [feed, setFeed] = useState<Post[]>(initialPosts);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  const toggleLike = (postId: Post["id"]) => {
    setFeed((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              viewer: {
                ...post.viewer,
                liked: !post.viewer.liked,
              },
              stats: {
                ...post.stats,
                likes: post.viewer.liked
                  ? post.stats.likes - 1
                  : post.stats.likes + 1,
              },
            }
          : post,
      ),
    );
  };

  const toggleBookmark = (postId: Post["id"]) => {
    setFeed((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              viewer: {
                ...post.viewer,
                bookmarked: !post.viewer.bookmarked,
              },
            }
          : post,
      ),
    );
  };

  return {
    feed,
    viewMode,
    setViewMode,
    toggleLike,
    toggleBookmark,
  };
}
