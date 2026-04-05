"use client";

import {
  startTransition,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { useAuthClient } from "@/features/auth/components/auth-required-provider";
import { useAuthRequiredAction } from "@/features/auth/hooks/use-auth-required-action";
import { LeftNav } from "@/components/layout/left-nav";
import { LegalSidebar } from "@/components/layout/legal-sidebar";
import { DEFAULT_ACTIVE_SECTION, navItems } from "@/constants/navigation";
import { CommentsSection } from "@/features/comments/components/comments-section";
import { CardPostItem } from "@/features/feed/components/card-post-item";
import { getDiscussionBodyText } from "@/features/feed/lib/discussion-detail";
import { isPostOwnedByUser } from "@/features/feed/lib/post-ownership";
import type { PostMenuActionId } from "@/features/feed/constants/post-menu";
import type { Post } from "@/features/feed/types";
import { BackNavigationButton } from "@/features/topic-creation/components/back-navigation-button";
import {
  requestTopicDraftRestore,
  saveTopicDraft,
} from "@/features/topic-creation/lib/draft-storage";

type DiscussionViewScreenProps = {
  initialPost: Post | null;
};

function toggleLikeState(post: Post) {
  return {
    ...post,
    viewer: {
      ...post.viewer,
      liked: !post.viewer.liked,
    },
    stats: {
      ...post.stats,
      likes: post.viewer.liked ? post.stats.likes - 1 : post.stats.likes + 1,
    },
  };
}

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
}: DiscussionViewScreenProps) {
  const router = useRouter();
  const { user } = useAuthClient();
  const { runIfAuthorized } = useAuthRequiredAction();
  const [post, setPost] = useState<Post | null>(initialPost);

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
      router.push("/");
    });
  }

  function handleToggleLike(postIdToToggle: Post["id"]) {
    void runIfAuthorized(() => {
      setPost((currentPost) => {
        const sourcePost =
          currentPost && currentPost.id === postIdToToggle
            ? currentPost
            : null;

        if (!sourcePost) {
          return currentPost;
        }

        return toggleLikeState(sourcePost);
      });
    });
  }

  function handlePostMenuAction(actionId: PostMenuActionId, postIdToHandle: Post["id"]) {
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
        router.push("/");
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
      startTransition(() => {
        router.push("/create-topic");
      });
    }
  }

  return (
    <div className="surface-primary text-label-primary min-h-dvh">
      <AppHeader />

      <div className="min-[721px]:pt-[var(--app-header-height)]">
        <main className="mx-auto grid w-full grid-cols-1 gap-0 px-4 sm:px-6 lg:grid-cols-[minmax(var(--app-shell-side-column-min-width),1fr)_minmax(0,var(--app-shell-content-max-width))_minmax(var(--app-shell-side-column-min-width),1fr)] lg:px-0 min-[1441px]:max-w-[var(--app-shell-max-width)] min-[1441px]:px-5">
          <LeftNav
            items={navItems}
            activeSection={DEFAULT_ACTIVE_SECTION}
          />

          <section className="surface-primary border-separator -mx-4 min-w-0 sm:-mx-6 lg:mx-0 lg:border-l lg:border-r">
            <div className="border-separator border-b px-4 py-2 sm:px-5">
              <BackNavigationButton onClick={handleBack} />
            </div>

            {detailedPost ? (
              <>
                <div className="px-5 py-4 sm:px-6">
                  <CardPostItem
                    post={detailedPost}
                    onToggleLike={handleToggleLike}
                    onPostMenuAction={handlePostMenuAction}
                  />
                </div>

                <div className="border-separator border-t px-5 py-6 sm:px-6">
                  <CommentsSection pageId={`discussion:${detailedPost.id}`} />
                </div>
              </>
            ) : (
              <div className="px-5 py-5 sm:px-6">
                <div className="py-12 text-center">
                  <h1 className="font-helvetica text-label-primary text-[20px] font-semibold leading-6">
                    Обсуждение не найдено
                  </h1>
                  <p className="text-label-secondary mt-3 text-[16px] leading-6">
                    Возможно, оно было удалено или ссылка устарела.
                  </p>
                </div>
              </div>
            )}
          </section>

          <LegalSidebar />
        </main>
      </div>
    </div>
  );
}
