"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PostMenuActionId } from "@/features/feed/constants/post-menu";
import {
  DEFAULT_FEED_SORT_MODE,
  DEFAULT_VIEW_MODE,
} from "@/features/feed/constants/feed";
import {
  clearHighlightedPublishedPostId,
  mergePublishedPosts,
  readHighlightedPublishedPostId,
  readPublishedPosts,
} from "@/features/feed/lib/published-posts";
import {
  requestTopicDraftRestore,
  saveTopicDraft,
} from "@/features/topic-creation/lib/draft-storage";
import type {
  FeedSortMode,
  FeedTopicFilter,
  Post,
  ViewMode,
} from "@/features/feed/types";

type UseFeedOptions = {
  initialPosts: Post[];
  initialViewMode?: ViewMode;
  initialSortMode?: FeedSortMode;
};

function sortFeed(posts: Post[], sortMode: FeedSortMode): Post[] {
  const sortedPosts = [...posts];

  if (sortMode === "Новые") {
    return sortedPosts.sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
  }

  if (sortMode === "Горячее") {
    return sortedPosts.sort((left, right) => {
      if (right.stats.likes !== left.stats.likes) {
        return right.stats.likes - left.stats.likes;
      }

      return right.stats.comments - left.stats.comments;
    });
  }

  return sortedPosts.sort((left, right) => {
    const leftHasNoAnswers = left.stats.comments === 0;
    const rightHasNoAnswers = right.stats.comments === 0;

    if (leftHasNoAnswers !== rightHasNoAnswers) {
      return leftHasNoAnswers ? -1 : 1;
    }

    if (left.stats.comments !== right.stats.comments) {
      return left.stats.comments - right.stats.comments;
    }

    return right.stats.likes - left.stats.likes;
  });
}

export function useFeed({
  initialPosts,
  initialViewMode = DEFAULT_VIEW_MODE,
  initialSortMode = DEFAULT_FEED_SORT_MODE,
}: UseFeedOptions) {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(
    null,
  );
  const [activeTopic, setActiveTopic] = useState<FeedTopicFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [sortMode, setSortMode] = useState<FeedSortMode>(initialSortMode);
  const filteredPosts =
    activeTopic === "all"
      ? posts
      : posts.filter((post) => post.topic === activeTopic);
  const feed = sortFeed(filteredPosts, sortMode);

  useLayoutEffect(() => {
    const publishedPosts = readPublishedPosts();
    const nextHighlightedPostId = readHighlightedPublishedPostId();
    let cancelled = false;
    let highlightTimer: number | undefined;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      if (publishedPosts.length > 0) {
        setPosts(mergePublishedPosts(initialPosts, publishedPosts));
      }

      if (!nextHighlightedPostId) {
        return;
      }

      setHighlightedPostId(nextHighlightedPostId);
      highlightTimer = window.setTimeout(() => {
        setHighlightedPostId(null);
        clearHighlightedPublishedPostId();
      }, 1000);
    });

    return () => {
      cancelled = true;

      if (highlightTimer) {
        window.clearTimeout(highlightTimer);
      }
    };
  }, [initialPosts]);

  const toggleLike = (postId: Post["id"]) => {
    setPosts((current) =>
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
    setPosts((current) =>
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

  const handlePostMenuAction = (
    actionId: PostMenuActionId,
    postId: Post["id"],
  ) => {
    if (actionId === "edit") {
      const postToEdit = posts.find((post) => post.id === postId);

      if (!postToEdit?.viewer.isAuthor || !postToEdit.editorState) {
        return;
      }

      saveTopicDraft({
        ...postToEdit.editorState,
        editingPostId: postToEdit.id,
        updatedAt: new Date().toISOString(),
      });
      requestTopicDraftRestore();
      router.push("/create-topic");
      return;
    }

    if (actionId === "save") {
      toggleBookmark(postId);
      return;
    }

    if (actionId === "hide") {
      setPosts((current) => current.filter((post) => post.id !== postId));
    }
  };

  return {
    activeTopic,
    feed,
    handlePostMenuAction,
    highlightedPostId,
    setActiveTopic,
    sortMode,
    setSortMode,
    viewMode,
    setViewMode,
    toggleLike,
    toggleBookmark,
  };
}
