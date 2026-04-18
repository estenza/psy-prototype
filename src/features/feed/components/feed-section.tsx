"use client";

import Link from "next/link";
import { FeedToolbar } from "@/features/feed/components/feed-toolbar";
import { PostFeedItem } from "@/features/feed/components/post-feed-item";
import { useFeed } from "@/features/feed/hooks/use-feed";
import type { Post } from "@/features/feed/types";

type FeedSectionProps = {
  initialPosts: Post[];
};

export function FeedSection({ initialPosts }: FeedSectionProps) {
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
    <section className="min-w-0 min-[1024px]:min-w-[720px] min-[1140px]:min-w-0">
      <FeedToolbar
        activeTopic={activeTopic}
        sortMode={sortMode}
        viewMode={viewMode}
        onTopicChange={setActiveTopic}
        onSortModeChange={setSortMode}
        onViewModeChange={setViewMode}
      />

      <div className="space-y-4 px-4 pb-24 md:px-6 lg:px-0">
        {feed.length > 0 ? (
          feed.map((post) => {
            const isHighlighted = post.id === highlightedPostId;

            return (
              <article
                key={post.id}
                className="group relative cursor-pointer"
              >
                <Link
                  href={`/discussions/${post.id}`}
                  className="absolute inset-0 z-10 cursor-pointer rounded-[28px]"
                  aria-label={post.content.title}
                />
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
  );
}
