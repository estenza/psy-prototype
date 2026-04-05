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
    <section className="surface-primary border-separator -mx-4 min-w-0 sm:-mx-6 lg:mx-0 lg:border-l lg:border-r">
      <FeedToolbar
        activeTopic={activeTopic}
        sortMode={sortMode}
        viewMode={viewMode}
        onTopicChange={setActiveTopic}
        onSortModeChange={setSortMode}
        onViewModeChange={setViewMode}
      />

      <div className="pb-24">
        {feed.length > 0 ? (
          feed.map((post) => {
            const isHighlighted = post.id === highlightedPostId;

            return (
              <article
                key={post.id}
                className="border-separator group relative cursor-pointer border-b"
              >
                <Link
                  href={`/discussions/${post.id}`}
                  className="absolute inset-0 z-10 cursor-pointer"
                  aria-label={post.content.title}
                />
                <div
                  className={`relative px-5 py-4 sm:px-6 ${
                    isHighlighted
                      ? "feed-post-flash"
                      : "group-hover:bg-[var(--fill-card-hover)]"
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
          <div className="flex justify-center px-5 py-12 text-center sm:px-6 sm:py-16">
            <div className="max-w-[640px]">
              <h2 className="font-helvetica text-label-primary text-[20px] font-semibold leading-6 sm:text-[22px] sm:leading-7">
                {activeTopic === "all"
                  ? "Пока нет опубликованных обсуждений"
                  : "Пока нет тем по этому фильтру"}
              </h2>
              <p className="text-label-secondary mt-3 text-[16px] leading-7">
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
