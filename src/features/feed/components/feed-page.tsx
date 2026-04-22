"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FeedToolbar } from "@/features/feed/components/feed-toolbar";
import { PostFeedItem } from "@/features/feed/components/post-feed-item";
import { useFeed } from "@/features/feed/hooks/use-feed";
import { isInteractivePostCardTarget } from "@/features/feed/lib/post-card-navigation";
import type { Post } from "@/features/feed/types";

type FeedPageProps = {
  initialPosts: Post[];
  leftNav: ReactNode;
  rightSidebar: ReactNode;
};

export function FeedPage({ initialPosts, leftNav, rightSidebar }: FeedPageProps) {
  const router = useRouter();
  const {
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
  } = useFeed({ initialPosts });

  return (
    <div className="min-[721px]:pt-[var(--app-header-height)]">
      {/* Toolbar — full width, border-b */}
      <div className="surface-primary relative z-30">
        <div className="mx-auto grid w-full grid-cols-1 lg:grid-cols-[minmax(var(--app-shell-side-column-min-width),1fr)_minmax(0,var(--app-shell-content-max-width))_minmax(var(--app-shell-side-column-min-width),1fr)] min-[1441px]:max-w-[var(--app-shell-max-width)] min-[1441px]:px-5">
          <div className="hidden lg:block" />
          <div>
            <FeedToolbar
              activeTopic={activeTopic}
              sortMode={sortMode}
              viewMode={viewMode}
              onTopicChange={setActiveTopic}
              onSortModeChange={setSortMode}
              onViewModeChange={setViewMode}
            />
          </div>
          <div className="hidden lg:block" />
        </div>
      </div>

      {/* 3-column layout */}
      <main className="mx-auto grid w-full grid-cols-1 gap-0 px-0 sm:px-0 lg:grid-cols-[minmax(var(--app-shell-side-column-min-width),1fr)_minmax(0,var(--app-shell-content-max-width))_minmax(var(--app-shell-side-column-min-width),1fr)] lg:px-0 min-[1441px]:max-w-[var(--app-shell-max-width)] min-[1441px]:px-5">
        {leftNav}

        <section className="min-w-0">
          <div className="space-y-4 px-4 pb-24 sm:px-6 lg:px-0">
            {feed.length > 0 ? (
              feed.map((post) => {
                const isHighlighted = post.id === highlightedPostId;
                return (
                  <article
                    key={post.id}
                    className="group relative cursor-pointer"
                    role="link"
                    tabIndex={0}
                    aria-label={post.content.title}
                    onClick={(event) => {
                      if (isInteractivePostCardTarget(event.target, event.currentTarget)) {
                        return;
                      }

                      router.push(`/discussions/${post.id}`);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") {
                        return;
                      }

                      if (isInteractivePostCardTarget(event.target, event.currentTarget)) {
                        return;
                      }

                      event.preventDefault();
                      router.push(`/discussions/${post.id}`);
                    }}
                  >
                    <div
                      className={`surface-card feed-card-surface relative px-5 py-4 sm:px-6 ${
                        isHighlighted ? "feed-post-flash" : ""
                      }`}
                    >
                      <PostFeedItem
                        onPostMenuAction={handlePostMenuAction}
                        post={post}
                        viewMode={viewMode}
                        onToggleLike={toggleLike}
                      />
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="surface-card flex justify-center px-5 py-12 text-center sm:px-6 sm:py-16">
                <div className="max-w-[640px]">
                  <h2 className="type-empty-state-title text-label-primary">
                    {activeTopic === "all"
                      ? "Пока нет опубликованных обсуждений"
                      : "Пока нет тем по этому фильтру"}
                  </h2>
                  <p className="type-empty-state-body text-label-tertiary mt-3">
                    {activeTopic === "all"
                      ? "Создайте первое обсуждение, и оно сразу появится здесь в ленте."
                      : "Попробуйте выбрать другую тему или вернитесь к общей ленте. Все публикации остаются в одном потоке, а темы работают как фильтр и метаданные."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {rightSidebar}
      </main>
    </div>
  );
}
