"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PostFeedItem } from "@/features/feed/components/post-feed-item";
import { useFeed } from "@/features/feed/hooks/use-feed";
import { buildDiscussionHref } from "@/features/feed/lib/discussion-navigation";
import { isInteractivePostCardTarget } from "@/features/feed/lib/post-card-navigation";
import type { Post } from "@/features/feed/types";

type ProfileDiscussionsSectionProps = {
  emptyTitle: string;
  emptyDescription: string;
  initialPosts: Post[];
};

export function ProfileDiscussionsSection({
  emptyTitle,
  emptyDescription,
  initialPosts,
}: ProfileDiscussionsSectionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentProfilePath = `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;
  const {
    feed,
    handlePostMenuAction,
    highlightedPostId,
    toggleLike,
    viewMode,
  } = useFeed({ initialPosts });

  return (
    <section className="mx-auto w-full min-w-0 max-w-[672px]">
      <div className="px-2 pt-8 pb-8 min-[481px]:px-3 min-[481px]:pb-12 min-[721px]:px-0 min-[721px]:pb-24">
        <div className="space-y-2 min-[481px]:space-y-3 min-[721px]:space-y-4">
          {feed.length > 0 ? (
            feed.map((post) => {
              const isHighlighted = post.id === highlightedPostId;
              const discussionHref = buildDiscussionHref(post.id, currentProfilePath);

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

                    router.push(discussionHref);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") {
                      return;
                    }

                    if (isInteractivePostCardTarget(event.target, event.currentTarget)) {
                      return;
                    }

                    event.preventDefault();
                    router.push(discussionHref);
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
                      discussionHref={discussionHref}
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
                  {emptyTitle}
                </h2>
                <p className="type-empty-state-body text-label-tertiary mt-3">
                  {emptyDescription}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
