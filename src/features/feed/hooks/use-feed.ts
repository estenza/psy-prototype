"use client";

import { useLayoutEffect, useState } from "react";
import { toast } from "@/components/feedback/toast";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import type {
  PostMenuActionId,
  PostMenuActionPayload,
} from "@/features/feed/constants/post-menu";
import {
  DEFAULT_FEED_SORT_MODE,
  DEFAULT_VIEW_MODE,
} from "@/features/feed/constants/feed";
import {
  clearHighlightedPublishedPostId,
  consumePublishedPostToast,
  readHighlightedPublishedPostId,
} from "@/features/feed/lib/published-posts";
import {
  filterPostsByIgnoredAuthor,
  getPostAuthorHandle,
  requestIgnoreAuthor,
  showIgnoredAuthorToast,
} from "@/features/feed/lib/ignored-author-client";
import { normalizePostDates, normalizePostsDates } from "@/features/feed/lib/post-normalization";
import { isPostOwnedByUser } from "@/features/feed/lib/post-ownership";
import type {
  PostMutationResponse,
  PostRouteErrorResponse,
} from "@/features/feed/types";
import {
  requestTopicDraftRestore,
  saveTopicDraft,
} from "@/features/topic-creation/lib/draft-storage";
import {
  buildCreateTopicHref,
  getCurrentPathWithSearchAndHash,
} from "@/features/topic-creation/lib/create-topic-navigation";
import type {
  FeedPageInfo,
  FeedSortMode,
  FeedTopicFilter,
  Post,
  PostsResponsePayload,
  ViewMode,
} from "@/features/feed/types";

type UseFeedOptions = {
  initialPageInfo?: FeedPageInfo;
  initialPosts: Post[];
  initialViewMode?: ViewMode;
  initialSortMode?: FeedSortMode;
  removeFromFeedWhenBookmarkRemoved?: boolean;
  removeFromFeedWhenProfileFavoriteRemoved?: boolean;
};

function sortFeed(posts: Post[], sortMode: FeedSortMode): Post[] {
  const sortedPosts = [...posts];

  if (sortMode === "Новые") {
    return sortedPosts.sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
  }

  if (sortMode === "Обсуждают") {
    return sortedPosts.sort((left, right) => {
      if (right.stats.likes !== left.stats.likes) {
        return right.stats.likes - left.stats.likes;
      }

      return right.stats.comments - left.stats.comments;
    });
  }

  return sortedPosts;
}

export function useFeed({
  initialPageInfo,
  initialPosts,
  initialViewMode = DEFAULT_VIEW_MODE,
  initialSortMode = DEFAULT_FEED_SORT_MODE,
  removeFromFeedWhenBookmarkRemoved = false,
  removeFromFeedWhenProfileFavoriteRemoved = false,
}: UseFeedOptions) {
  const { user } = useAuthClient();
  const { runIfAuthorized } = useAuthRequiredAction();
  const [posts, setPosts] = useState<Post[]>(() => normalizePostsDates(initialPosts));
  const [pageInfo, setPageInfo] = useState<FeedPageInfo | null>(initialPageInfo ?? null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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

  const loadMorePosts = () => {
    if (isLoadingMore || !pageInfo?.hasNextPage || !pageInfo.endCursor) {
      return;
    }

    setIsLoadingMore(true);

    const searchParams = new URLSearchParams();
    searchParams.set("cursor", pageInfo.endCursor);

    if (activeTopic !== "all") {
      searchParams.set("topic", activeTopic);
    }

    void fetch(`/api/posts?${searchParams.toString()}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as PostsResponsePayload | PostRouteErrorResponse | null;

        if (!response.ok) {
          throw new Error(
            payload && "error" in payload
              ? payload.error
              : "Не удалось загрузить еще посты.",
          );
        }

        const postsPayload = payload as PostsResponsePayload;
        const nextPosts = normalizePostsDates(postsPayload.posts);

        setPosts((currentPosts) => {
          const existingIds = new Set(currentPosts.map((post) => post.id));
          return [
            ...currentPosts,
            ...nextPosts.filter((post) => !existingIds.has(post.id)),
          ];
        });
        setPageInfo(postsPayload.pageInfo ?? null);
      })
      .catch((error: unknown) => {
        toast.danger(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить еще посты.",
        );
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  };

  useLayoutEffect(() => {
    const nextHighlightedPostId = readHighlightedPublishedPostId();
    const publishedPostToast = consumePublishedPostToast();
    let cancelled = false;
    let highlightTimer: number | undefined;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      if (publishedPostToast) {
        toast.success(publishedPostToast);
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

  const toggleLike = (postId: Post["id"], liked: boolean) => {
    void runIfAuthorized(async () => {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ liked }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as PostRouteErrorResponse | null;
        throw new Error(payload?.error ?? "Не удалось обновить лайк.");
      }

      const payload = await response.json() as PostMutationResponse;

      setPosts((current) =>
        current.map((post) => (
          post.id === payload.post.id
            ? normalizePostDates(payload.post)
            : post
        )),
      );
    }).catch((error: unknown) => {
      const message = error instanceof Error
        ? error.message
        : "Не удалось обновить лайк.";
      toast.danger(message);
    });
  };

  const toggleBookmark = (postId: Post["id"]) => {
    void runIfAuthorized(async () => {
      const postToToggle = posts.find((post) => post.id === postId);
      const nextBookmarked = !postToToggle?.viewer.bookmarked;

      setPosts((current) =>
        current.map((post) => {
          if (post.id !== postId) {
            return post;
          }

          const bookmarked = !post.viewer.bookmarked;

          return {
            ...post,
            viewer: {
              ...post.viewer,
              bookmarked,
            },
          };
        }),
      );
      toast.success(nextBookmarked ? "Пост добавлен в закладки" : "Пост убран из закладок");

      const response = await fetch(`/api/posts/${postId}/bookmark`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookmarked: nextBookmarked }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as PostRouteErrorResponse | null;
        throw new Error(payload?.error ?? "Не удалось обновить закладки.");
      }

      const payload = await response.json() as PostMutationResponse;

      setPosts((current) =>
        removeFromFeedWhenBookmarkRemoved && !nextBookmarked
          ? current.filter((post) => post.id !== payload.post.id)
          : current.map((post) => (
              post.id === payload.post.id
                ? normalizePostDates(payload.post)
                : post
            )),
      );
    }).catch((error: unknown) => {
      const message = error instanceof Error
        ? error.message
        : "Не удалось обновить закладки.";
      toast.danger(message);
    });
  };

  const setProfileFavorite = (postId: Post["id"], favorited: boolean) => {
    void runIfAuthorized(async () => {
      const response = await fetch(`/api/posts/${postId}/profile-favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ favorited }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as PostRouteErrorResponse | null;
        throw new Error(payload?.error ?? "Не удалось обновить избранное.");
      }

      const payload = await response.json() as PostMutationResponse;

      setPosts((current) =>
        removeFromFeedWhenProfileFavoriteRemoved && !favorited
          ? current.filter((post) => post.id !== payload.post.id)
          : current.map((post) => (
              post.id === payload.post.id
                ? normalizePostDates(payload.post)
                : post
            )),
      );

      toast.success(favorited ? "Пост добавлен в профиль" : "Пост убран из профиля");
    }).catch((error: unknown) => {
      const message = error instanceof Error
        ? error.message
        : "Не удалось обновить избранное.";
      toast.danger(message);
    });
  };

  const handlePostMenuAction = async (
    actionId: PostMenuActionId,
    postId: Post["id"],
    payload?: PostMenuActionPayload,
  ) => {
    if (actionId === "edit") {
      const postToEdit = posts.find((post) => post.id === postId);

      if (!postToEdit || !isPostOwnedByUser(postToEdit, user) || !postToEdit.editorState) {
        return;
      }

      saveTopicDraft({
        ...postToEdit.editorState,
        editingPostId: postToEdit.id,
        updatedAt: new Date().toISOString(),
      });
      requestTopicDraftRestore();
      window.location.assign(
        buildCreateTopicHref(getCurrentPathWithSearchAndHash()),
      );
      return;
    }

    if (actionId === "delete") {
      const postToDelete = posts.find((post) => post.id === postId);

      if (!postToDelete || !isPostOwnedByUser(postToDelete, user)) {
        return;
      }

      await runIfAuthorized(async () => {
        const response = await fetch(`/api/posts/${postId}`, {
          method: "DELETE",
        });
        const payload = (await response.json()) as {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Не удалось удалить пост.");
        }

        setPosts((current) => current.filter((post) => post.id !== postId));
        toast.success("Пост удалён");
      });
      return;
    }

    if (actionId === "profile-favorite") {
      const postToFavorite = posts.find((post) => post.id === postId);

      if (!postToFavorite) {
        return;
      }

      setProfileFavorite(postId, !postToFavorite.viewer.profileFavorite);
      return;
    }

    if (actionId === "follow" || actionId === "follow-author") {
      const postToFollow = posts.find((post) => post.id === postId);

      if (!postToFollow) {
        return;
      }

      if (actionId === "follow-author") {
        void runIfAuthorized(async () => {
          const response = await fetch("/api/follows/authors", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              followedUserId: postToFollow.author.id,
              following: true,
            }),
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as PostRouteErrorResponse | null;
            throw new Error(payload?.error ?? "Не удалось подписаться на автора.");
          }

          toast.success(`Теперь вы читаете ${postToFollow.author.handle}`);
        }).catch((error: unknown) => {
          const message = error instanceof Error
            ? error.message
            : "Не удалось подписаться на автора.";
          toast.danger(message);
        });
        return;
      }

      void runIfAuthorized(async () => {
        const response = await fetch(`/api/posts/${postId}/follow`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ following: true }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as PostRouteErrorResponse | null;
          throw new Error(payload?.error ?? "Не удалось включить уведомления по посту.");
        }

        toast.success("Теперь вы следите за постом");
      }).catch((error: unknown) => {
        const message = error instanceof Error
          ? error.message
          : "Не удалось включить уведомления по посту.";
        toast.danger(message);
      });
      return;
    }

    if (actionId === "hide") {
      const postToIgnore = posts.find((post) => post.id === postId);

      const ignoredUserId = postToIgnore?.author.id;

      if (!ignoredUserId) {
        return;
      }

      await runIfAuthorized(async () => {
        await requestIgnoreAuthor(ignoredUserId);
        setPosts((current) => filterPostsByIgnoredAuthor(current, ignoredUserId));
        showIgnoredAuthorToast({
          authorHandle: getPostAuthorHandle(postToIgnore),
          ignoredUserId,
        });
      }).catch((error: unknown) => {
        const message = error instanceof Error
          ? error.message
          : "Не удалось обновить игнор-лист.";
        toast.danger(message);
      });
    }

    if (actionId === "report") {
      await runIfAuthorized(async () => {
        const response = await fetch(`/api/posts/${postId}/report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: payload?.reason,
          }),
        });

        if (!response.ok) {
          const responsePayload = (await response.json().catch(() => null)) as PostRouteErrorResponse | null;
          throw new Error(responsePayload?.error ?? "Не удалось отправить жалобу.");
        }

        setPosts((current) => current.filter((post) => post.id !== postId));
        toast.success("Жалоба на пост отправлена");
      });
    }
  };

  return {
    activeTopic,
    feed,
    handlePostMenuAction,
    highlightedPostId,
    isLoadingMore,
    loadMorePosts,
    pageInfo,
    setActiveTopic,
    sortMode,
    setSortMode,
    viewMode,
    setViewMode,
    toggleLike,
    toggleBookmark,
  };
}
