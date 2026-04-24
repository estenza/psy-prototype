"use client";

import {
  startTransition,
  useEffect,
  useState,
} from "react";
import { toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { DesktopAppShell } from "@/components/layout/desktop-app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import { CommentsSection } from "@/features/comments/components/comments-section";
import { CardPostItem } from "@/features/feed/components/card-post-item";
import { getDiscussionBodyText } from "@/features/feed/lib/discussion-detail";
import { normalizeDiscussionReturnTo } from "@/features/feed/lib/discussion-navigation";
import { isPostOwnedByUser } from "@/features/feed/lib/post-ownership";
import type { PostMenuActionId } from "@/features/feed/constants/post-menu";
import type {
  DiscussionMutationResponse,
  DiscussionRouteErrorResponse,
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

type DiscussionViewScreenProps = {
  initialPost: Post | null;
  initialReturnTo?: string | null;
  initialHighlightedCommentId?: string | null;
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

export function DiscussionViewScreen({
  initialPost,
  initialReturnTo = null,
  initialHighlightedCommentId = null,
}: DiscussionViewScreenProps) {
  const router = useRouter();
  const { user } = useAuthClient();
  const { runIfAuthorized } = useAuthRequiredAction();
  const [post, setPost] = useState<Post | null>(initialPost);
  const returnTo = normalizeDiscussionReturnTo(initialReturnTo);

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const detailedPost = post
    ? {
        ...post,
        content: {
          ...post.content,
          excerpt: getDiscussionBodyText(post),
        },
      }
    : null;

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
      const response = await fetch(`/api/discussions/${postIdToToggle}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ liked }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as DiscussionRouteErrorResponse | null;
        throw new Error(payload?.error ?? "Не удалось обновить лайк.");
      }

      const payload = await response.json() as DiscussionMutationResponse;
      setPost(payload.post);
    }).catch((error: unknown) => {
      const message = error instanceof Error
        ? error.message
        : "Не удалось обновить лайк.";
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

    if (actionId === "save") {
      void runIfAuthorized(() => {
        setPost(toggleBookmarkState(currentPost));
      });
      return;
    }

    if (actionId === "follow") {
      void runIfAuthorized(async () => undefined);
      return;
    }

    if (actionId === "hide") {
      startTransition(() => {
        router.push(returnTo ?? "/");
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
        const response = await fetch(`/api/discussions/${currentPost.id}`, {
          method: "DELETE",
        });
        const payload = (await response.json()) as {
          error?: string;
        };

        await loadingDelay;

        if (!response.ok) {
          throw new Error(payload.error ?? "Не удалось удалить обсуждение.");
        }

        toast.success("Обсуждение удалено");

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
    <div className="surface-primary text-label-primary min-h-[100svh] min-[721px]:min-h-dvh">
      <AppHeader />

      <div className="min-[721px]:pt-[var(--app-header-height)]">
        <DesktopAppShell
          centerClassName="w-full max-w-[672px]"
          fitCenterToContent
        >
          <section className="min-w-0">
            <PageHeader onBack={handleBack} />

            {detailedPost ? (
              <div className="space-y-2 px-2 pb-8 min-[481px]:space-y-3 min-[481px]:px-3 min-[481px]:pb-12 min-[721px]:space-y-4 min-[721px]:px-0 min-[721px]:pb-24">
                <div className="surface-card px-3 py-4 min-[481px]:px-5 sm:px-6">
                  <CardPostItem
                    post={detailedPost}
                    blockPointerEvents={false}
                    onToggleLike={handleToggleLike}
                    onPostMenuAction={handlePostMenuAction}
                  />
                </div>

                <div className="surface-card feed-card-surface px-3 pb-8 pt-0 min-[481px]:px-5 sm:px-6">
                  <CommentsSection
                    pageId={`discussion:${detailedPost.id}`}
                    highlightedCommentId={initialHighlightedCommentId}
                  />
                </div>
              </div>
            ) : (
              <div className="px-2 pb-8 min-[481px]:px-3 min-[481px]:pb-12 min-[721px]:px-0 min-[721px]:pb-24">
                <div className="surface-card px-5 py-12 text-center sm:px-6">
                  <h1 className="type-feed-title text-label-primary">
                    Обсуждение не найдено
                  </h1>
                  <p className="type-body-lg text-label-secondary mt-3">
                    Возможно, оно было удалено или ссылка устарела.
                  </p>
                </div>
              </div>
            )}
          </section>
        </DesktopAppShell>
      </div>
    </div>
  );
}
