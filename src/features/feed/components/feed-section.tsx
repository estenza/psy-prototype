"use client";

import { useRouter } from "next/navigation";
import { FeedToolbar } from "@/features/feed/components/feed-toolbar";
import { PostFeedItem } from "@/features/feed/components/post-feed-item";
import { useFeed } from "@/features/feed/hooks/use-feed";
import { isInteractivePostCardTarget } from "@/features/feed/lib/post-card-navigation";
import type { Post } from "@/features/feed/types";

type FeedSectionProps = {
  initialPosts: Post[];
};

export function FeedSection({ initialPosts }: FeedSectionProps) {
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
    <section className="mx-auto w-full min-w-0 max-w-[672px]">
      <FeedToolbar
        activeTopic={activeTopic}
        sortMode={sortMode}
        viewMode={viewMode}
        onTopicChange={setActiveTopic}
        onSortModeChange={setSortMode}
        onViewModeChange={setViewMode}
      />

      <div className="px-2 pb-8 min-[481px]:px-3 min-[481px]:pb-12 min-[721px]:px-0 min-[721px]:pb-24">
        <div className="space-y-2 min-[481px]:space-y-3 min-[721px]:space-y-4">
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
                    className={`surface-card feed-card-surface relative px-3 py-4 min-[481px]:px-5 sm:px-6 ${
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
      </div>
    </section>
  );
}
