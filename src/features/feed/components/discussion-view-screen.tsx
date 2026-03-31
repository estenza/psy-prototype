"use client";

import {
  startTransition,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { LeftNav } from "@/components/layout/left-nav";
import { LegalSidebar } from "@/components/layout/legal-sidebar";
import { DEFAULT_ACTIVE_SECTION, navItems } from "@/constants/navigation";
import { HyvorTalkComments } from "@/features/comments/components/hyvor-talk-comments";
import { CardPostItem } from "@/features/feed/components/card-post-item";
import {
  findStaticDiscussionPostById,
  getDiscussionBodyText,
} from "@/features/feed/lib/discussion-detail";
import { findPublishedPostById } from "@/features/feed/lib/published-posts";
import type { PostMenuActionId } from "@/features/feed/constants/post-menu";
import type { Post } from "@/features/feed/types";
import { BackNavigationButton } from "@/features/topic-creation/components/back-navigation-button";
import {
  requestTopicDraftRestore,
  saveTopicDraft,
} from "@/features/topic-creation/lib/draft-storage";
import { getUserAvatarTone } from "@/lib/avatar-tone";

type DiscussionViewScreenProps = {
  postId: string;
};

function subscribeToClientRender() {
  return () => {};
}

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

export function DiscussionViewScreen({ postId }: DiscussionViewScreenProps) {
  const router = useRouter();
  const isClient = useSyncExternalStore(
    subscribeToClientRender,
    () => true,
    () => false,
  );
  const staticPost = useMemo(() => findStaticDiscussionPostById(postId), [postId]);
  const [post, setPost] = useState<Post | null>(staticPost);

  const resolvedPost = useMemo(() => {
    if (post) {
      return post;
    }

    if (!isClient) {
      return staticPost;
    }

    return findPublishedPostById(postId) ?? staticPost;
  }, [isClient, post, postId, staticPost]);

  const detailedPost = useMemo(() => {
    if (!resolvedPost) {
      return null;
    }

    return {
      ...resolvedPost,
      content: {
        ...resolvedPost.content,
        excerpt: getDiscussionBodyText(resolvedPost),
      },
    };
  }, [resolvedPost]);

  function handleBack() {
    startTransition(() => {
      router.push("/");
    });
  }

  function handleToggleLike(postIdToToggle: Post["id"]) {
    setPost((currentPost) => {
      const sourcePost =
        currentPost && currentPost.id === postIdToToggle
          ? currentPost
          : resolvedPost && resolvedPost.id === postIdToToggle
            ? resolvedPost
            : null;

      if (!sourcePost) {
        return currentPost;
      }

      return toggleLikeState(sourcePost);
    });
  }

  function handlePostMenuAction(actionId: PostMenuActionId, postIdToHandle: Post["id"]) {
    const currentPost =
      post && post.id === postIdToHandle
        ? post
        : resolvedPost && resolvedPost.id === postIdToHandle
          ? resolvedPost
          : null;

    if (!currentPost) {
      return;
    }

    if (actionId === "save") {
      setPost(toggleBookmarkState(currentPost));
      return;
    }

    if (actionId === "hide") {
      startTransition(() => {
        router.push("/");
      });
      return;
    }

    if (actionId === "edit" && currentPost.viewer.isAuthor && currentPost.editorState) {
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
      <AppHeader
        profileInitials="VZ"
        profileToneClass={getUserAvatarTone("VZ")}
      />

      <div className="pt-[var(--app-header-height)]">
        <main className="mx-auto grid w-full grid-cols-1 gap-0 px-4 sm:px-6 xl:max-w-[var(--app-shell-max-width)] xl:grid-cols-[minmax(var(--app-shell-side-column-min-width),1fr)_minmax(0,var(--app-shell-content-max-width))_minmax(var(--app-shell-side-column-min-width),1fr)] xl:px-5">
          <LeftNav
            items={navItems}
            activeSection={DEFAULT_ACTIVE_SECTION}
          />

          <section className="surface-primary border-separator min-w-0 border-l border-r">
            <div className="border-separator border-b px-5 py-4 sm:px-6">
              <BackNavigationButton
                onClick={handleBack}
                label="Назад"
              />
            </div>

            <div className="px-5 py-5 sm:px-6">
              {detailedPost ? (
                <>
                  <CardPostItem
                    post={detailedPost}
                    onToggleLike={handleToggleLike}
                    onPostMenuAction={handlePostMenuAction}
                  />

                  <div className="border-separator mt-8 border-t pt-6">
                    <h2 className="font-helvetica text-label-primary text-[20px] font-semibold leading-6">
                      Комментарии
                    </h2>
                    <HyvorTalkComments
                      pageId={`discussion:${detailedPost.id}`}
                      className="mt-4"
                    />
                  </div>
                </>
              ) : isClient ? (
                <div className="py-12 text-center">
                  <h1 className="font-helvetica text-label-primary text-[20px] font-semibold leading-6">
                    Обсуждение не найдено
                  </h1>
                  <p className="text-label-secondary mt-3 text-[16px] leading-[1.45]">
                    Возможно, оно было удалено или ещё не загружено локально.
                  </p>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-label-secondary text-[16px] leading-[1.45]">
                    Загружаем обсуждение…
                  </p>
                </div>
              )}
            </div>
          </section>

          <LegalSidebar />
        </main>
      </div>
    </div>
  );
}
