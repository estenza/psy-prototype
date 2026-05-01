"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonClassName } from "@/components/ui/button-styles";
import { ContentPlaceholder } from "@/components/ui/content-placeholder";
import { FeedToolbar } from "@/features/feed/components/feed-toolbar";
import { PostFeedItem } from "@/features/feed/components/post-feed-item";
import { useFeed } from "@/features/feed/hooks/use-feed";
import { isInteractivePostCardTarget } from "@/features/feed/lib/post-card-navigation";
import type { FeedPageInfo, Post } from "@/features/feed/types";

type FeedSectionProps = {
  initialPageInfo?: FeedPageInfo;
  initialPosts: Post[];
};

export function FeedSection({ initialPageInfo, initialPosts }: FeedSectionProps) {
  const router = useRouter();
  const {
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
    toggleBookmark,
    toggleLike,
  } = useFeed({ initialPageInfo, initialPosts });

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

      <div className="px-0 min-[481px]:pb-12 min-[481px]:pb-24">
        <div className="space-y-2 min-[481px]:space-y-3 min-[481px]:space-y-4">
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

                    router.push(`/posts/${post.id}`);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") {
                      return;
                    }

                    if (isInteractivePostCardTarget(event.target, event.currentTarget)) {
                      return;
                    }

                    event.preventDefault();
                    router.push(`/posts/${post.id}`);
                  }}
                >
                  <div
                    className={`surface-card feed-card-surface relative px-3 py-4 min-[481px]:px-5 min-[481px]:px-6 ${
                      isHighlighted ? "feed-post-flash" : ""
                    }`}
                  >
                    <PostFeedItem
                      onPostMenuAction={handlePostMenuAction}
                      post={post}
                      viewMode={viewMode}
                      onToggleBookmark={toggleBookmark}
                      onToggleLike={toggleLike}
                    />
                  </div>
                </article>
              );
            })
          ) : (
            <ContentPlaceholder
              title={activeTopic === "all"
                ? "Пока никто ничего не запостил :("
                : "Пока нет тем по этому фильтру"}
              description={activeTopic === "all"
                ? "Напишите первый пост, и он сразу появится в ленте"
                : "Попробуйте выбрать другую тему или вернитесь к общей ленте. Все публикации остаются в одном потоке, а темы работают как фильтр и метаданные."}
              action={activeTopic === "all" ? (
                <Link
                  href="/create-topic?returnTo=%2F"
                  className={buttonClassName({
                    className: "type-body-md-medium h-11 px-6",
                    variant: "primary",
                  })}
                >
                  Написать
                </Link>
              ) : null}
            />
          )}

          {pageInfo?.hasNextPage ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={loadMorePosts}
                className={buttonClassName({
                  className: "type-body-md-medium h-11 px-6 disabled:cursor-wait disabled:opacity-70",
                  variant: "secondary",
                })}
              >
                {isLoadingMore ? "Загружаем..." : "Показать еще"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
