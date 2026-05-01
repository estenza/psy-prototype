"use client";

import {
  startTransition,
  useState,
} from "react";
import { toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { DesktopAppShell } from "@/components/layout/desktop-app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ContentPlaceholder } from "@/components/ui/content-placeholder";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import { CommentsSection } from "@/features/comments/components/comments-section";
import { CardPostItem } from "@/features/feed/components/card-post-item";
import {
  getPostAuthorHandle,
  requestIgnoreAuthor,
  showIgnoredAuthorToast,
} from "@/features/feed/lib/ignored-author-client";
import { getPostBodyText } from "@/features/feed/lib/post-detail";
import { normalizePostDates } from "@/features/feed/lib/post-normalization";
import { normalizePostReturnTo } from "@/features/feed/lib/post-navigation";
import { isPostOwnedByUser } from "@/features/feed/lib/post-ownership";
import type { PostMenuActionId } from "@/features/feed/constants/post-menu";
import type {
  PostMutationResponse,
  PostRouteErrorResponse,
  Post,
} from "@/features/feed/types";
import {
  requestTopicDraftRestore,
  saveTopicDraft,
} from "@/features/topic-creation/lib/draft-storage";
import {
  buildCreateTopicHref,
  getCurrentPathWithSearchAndHash,
} from "@/features/topic-creation/lib/create-topic-navigation";

type PostViewScreenProps = {
  initialPost: Post | null;
  initialReturnTo?: string | null;
  initialHighlightedCommentId?: string | null;
  initialHighlightedCommentIds?: string[];
};

const MIN_DELETE_LOADING_MS = 1000;

function toggleBookmarkState(post: Post) {
  return {
    ...post,
    viewer: {
      ...post.viewer,
      bookmarked: !post.viewer.bookmarked,
    },
  };
}

function setProfileFavoriteState(post: Post, profileFavorite: boolean) {
  return {
    ...post,
    viewer: {
      ...post.viewer,
      profileFavorite,
    },
  };
}

export function PostViewScreen({
  initialPost,
  initialReturnTo = null,
  initialHighlightedCommentId = null,
  initialHighlightedCommentIds = [],
}: PostViewScreenProps) {
  const router = useRouter();
  const { user } = useAuthClient();
  const { runIfAuthorized } = useAuthRequiredAction();
  const [post, setPost] = useState<Post | null>(
    initialPost ? normalizePostDates(initialPost) : null,
  );
  const [commentsCount, setCommentsCount] = useState(initialPost?.stats.comments ?? 0);
  const returnTo = normalizePostReturnTo(initialReturnTo);

  const detailedPost = post
    ? {
        ...post,
        content: {
          ...post.content,
          excerpt: getPostBodyText(post),
        },
      }
    : null;
  const hasComments = commentsCount > 0;

  function handleBack() {
    startTransition(() => {
      if (returnTo) {
        router.push(returnTo);
        return;
      }

      if (window.history.length > 1) {
        router.back();
        return;
      }

      router.push("/");
    });
  }

  function handleToggleLike(postIdToToggle: Post["id"], liked: boolean) {
    void runIfAuthorized(async () => {
      const response = await fetch(`/api/posts/${postIdToToggle}/like`, {
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
      setPost(normalizePostDates(payload.post));
    }).catch((error: unknown) => {
      const message = error instanceof Error
        ? error.message
        : "Не удалось обновить лайк.";
      toast.danger(message);
    });
  }

  function handleToggleBookmark(postIdToToggle: Post["id"]) {
    const currentPost =
      post && post.id === postIdToToggle
        ? post
        : null;

    if (!currentPost) {
      return;
    }

    void runIfAuthorized(async () => {
      const nextBookmarked = !currentPost.viewer.bookmarked;
      setPost(toggleBookmarkState(currentPost));
      toast.success(nextBookmarked ? "Пост добавлен в закладки" : "Пост убран из закладок");

      const response = await fetch(`/api/posts/${postIdToToggle}/bookmark`, {
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
      setPost(normalizePostDates(payload.post));
    }).catch((error: unknown) => {
      setPost(currentPost);
      const message = error instanceof Error
        ? error.message
        : "Не удалось обновить закладки.";
      toast.danger(message);
    });
  }

  async function handlePostMenuAction(actionId: PostMenuActionId, postIdToHandle: Post["id"]) {
    const currentPost =
      post && post.id === postIdToHandle
        ? post
        : null;

    if (!currentPost) {
      return;
    }

    if (actionId === "profile-favorite") {
      const nextProfileFavorite = !currentPost.viewer.profileFavorite;

      void runIfAuthorized(async () => {
        const response = await fetch(`/api/posts/${postIdToHandle}/profile-favorite`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ favorited: nextProfileFavorite }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as PostRouteErrorResponse | null;
          throw new Error(payload?.error ?? "Не удалось обновить избранное.");
        }

        const payload = await response.json() as PostMutationResponse;
        setPost(normalizePostDates(payload.post));
        toast.success(nextProfileFavorite ? "Пост добавлен в профиль" : "Пост убран из профиля");
      }).catch((error: unknown) => {
        setPost(setProfileFavoriteState(currentPost, currentPost.viewer.profileFavorite));
        const message = error instanceof Error
          ? error.message
          : "Не удалось обновить избранное.";
        toast.danger(message);
      });
      setPost(setProfileFavoriteState(currentPost, nextProfileFavorite));
      return;
    }

    if (actionId === "follow" || actionId === "follow-author") {
      if (actionId === "follow-author") {
        void runIfAuthorized(async () => {
          const response = await fetch("/api/follows/authors", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              followedUserId: currentPost.author.id,
              following: true,
            }),
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as PostRouteErrorResponse | null;
            throw new Error(payload?.error ?? "Не удалось подписаться на автора.");
          }

          toast.success(`Теперь вы читаете ${currentPost.author.handle}`);
        }).catch((error: unknown) => {
          const message = error instanceof Error
            ? error.message
            : "Не удалось подписаться на автора.";
          toast.danger(message);
        });
        return;
      }

      void runIfAuthorized(async () => {
        const response = await fetch(`/api/posts/${postIdToHandle}/follow`, {
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
      const ignoredUserId = currentPost.author.id;

      if (!ignoredUserId) {
        return;
      }

      void runIfAuthorized(async () => {
        await requestIgnoreAuthor(ignoredUserId);
        showIgnoredAuthorToast({
          authorHandle: getPostAuthorHandle(currentPost),
          ignoredUserId,
        });
        startTransition(() => {
          router.push(returnTo ?? "/");
        });
      }).catch((error: unknown) => {
        const message = error instanceof Error
          ? error.message
          : "Не удалось обновить игнор-лист.";
        toast.danger(message);
      });
      return;
    }

    if (actionId === "delete") {
      if (!isPostOwnedByUser(currentPost, user)) {
        return;
      }

      await runIfAuthorized(async () => {
        const loadingDelay = new Promise((resolve) => {
          window.setTimeout(resolve, MIN_DELETE_LOADING_MS);
        });
        const response = await fetch(`/api/posts/${currentPost.id}`, {
          method: "DELETE",
        });
        const payload = (await response.json()) as {
          error?: string;
        };

        await loadingDelay;

        if (!response.ok) {
          throw new Error(payload.error ?? "Не удалось удалить пост.");
        }

        toast.success("Пост удалён");

        startTransition(() => {
          router.push(returnTo ?? "/");
        });
      });
      return;
    }

    if (actionId === "edit" && isPostOwnedByUser(currentPost, user) && currentPost.editorState) {
      saveTopicDraft({
        ...currentPost.editorState,
        editingPostId: currentPost.id,
        updatedAt: new Date().toISOString(),
      });
      requestTopicDraftRestore();
      window.location.assign(
        buildCreateTopicHref(getCurrentPathWithSearchAndHash()),
      );
    }
  }

  return (
    <div className="surface-primary text-label-primary min-h-[100svh] min-[481px]:min-h-dvh">
      <AppHeader />

      <div className="min-[481px]:pt-[var(--app-header-height)]">
        <DesktopAppShell
          activeSection={null}
          centerClassName="w-full max-w-[672px]"
          fitCenterToContent
        >
          <section className="min-w-0">
            <PageHeader onBack={handleBack} />

            {detailedPost ? (
              <div className="space-y-2 pb-8 min-[481px]:space-y-4 min-[481px]:pb-24">
                <div className="surface-card px-3 py-4 min-[481px]:px-5 min-[481px]:px-6">
                  <CardPostItem
                    post={detailedPost}
                    blockPointerEvents={false}
                    onToggleBookmark={handleToggleBookmark}
                    onToggleLike={handleToggleLike}
                    onPostMenuAction={handlePostMenuAction}
                  />
                </div>

                <div
                  className={`surface-card feed-card-surface px-3 pt-0 min-[481px]:px-5 min-[481px]:px-6 ${
                    hasComments ? "pb-8" : "pb-0"
                  }`.trim()}
                >
                  <CommentsSection
                    pageId={`post:${detailedPost.id}`}
                    highlightedCommentId={initialHighlightedCommentId}
                    highlightedCommentIds={initialHighlightedCommentIds}
                    onTotalCountChange={setCommentsCount}
                  />
                </div>
              </div>
            ) : (
              <div className="pb-8 min-[481px]:pb-24">
                <ContentPlaceholder
                  titleAs="h1"
                  title="Пост не найден"
                  description="Возможно, оно было удалено или ссылка устарела."
                />
              </div>
            )}
          </section>
        </DesktopAppShell>
      </div>
    </div>
  );
}
