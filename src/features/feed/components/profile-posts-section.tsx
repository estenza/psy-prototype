"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ContentPlaceholder } from "@/components/ui/content-placeholder";
import { PostFeedItem } from "@/features/feed/components/post-feed-item";
import { useFeed } from "@/features/feed/hooks/use-feed";
import { buildPostHref } from "@/features/feed/lib/post-navigation";
import { isInteractivePostCardTarget } from "@/features/feed/lib/post-card-navigation";
import type { Post } from "@/features/feed/types";

type ProfilePostsSectionProps = {
  emptyTitle: string;
  emptyDescription: string;
  flushTop?: boolean;
  initialPosts: Post[];
  removeFromFeedWhenBookmarkRemoved?: boolean;
  removeFromFeedWhenProfileFavoriteRemoved?: boolean;
};

export function ProfilePostsSection({
  emptyTitle,
  emptyDescription,
  flushTop = false,
  initialPosts,
  removeFromFeedWhenBookmarkRemoved = false,
  removeFromFeedWhenProfileFavoriteRemoved = false,
}: ProfilePostsSectionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentProfilePath = `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;
  const {
    feed,
    handlePostMenuAction,
    highlightedPostId,
    toggleBookmark,
    toggleLike,
    viewMode,
  } = useFeed({
    initialPosts,
    removeFromFeedWhenBookmarkRemoved,
    removeFromFeedWhenProfileFavoriteRemoved,
  });

  return (
    <section className="mx-auto w-full min-w-0 max-w-[672px]">
      <div
        className={`pb-8 min-[481px]:pb-24 ${
          flushTop ? "" : "pt-8"
        }`.trim()}
      >
        <div className="space-y-2 min-[481px]:space-y-3 min-[481px]:space-y-4">
          {feed.length > 0 ? (
            feed.map((post) => {
              const isHighlighted = post.id === highlightedPostId;
              const postHref = buildPostHref(post.id, currentProfilePath);

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

                    router.push(postHref);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") {
                      return;
                    }

                    if (isInteractivePostCardTarget(event.target, event.currentTarget)) {
                      return;
                    }

                    event.preventDefault();
                    router.push(postHref);
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
                      postHref={postHref}
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
              title={emptyTitle}
              description={emptyDescription}
            />
          )}
        </div>
      </div>
    </section>
  );
}
