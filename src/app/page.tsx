"use client";

import { DEFAULT_ACTIVE_SECTION, navItems } from "@/constants/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { LeftNav } from "@/components/layout/left-nav";
import { LegalSidebar } from "@/components/layout/legal-sidebar";
import { FeedToolbar } from "@/features/feed/components/feed-toolbar";
import { PostFeedItem } from "@/features/feed/components/post-feed-item";
import { mockPosts } from "@/features/feed/mocks/mock-posts";
import { useFeed } from "@/hooks/use-feed";
import { getUserAvatarTone } from "@/lib/avatar-tone";

export default function Home() {
  const { feed, viewMode, setViewMode, toggleLike, toggleBookmark } = useFeed({
    initialPosts: mockPosts,
  });

  return (
    <div className="surface-primary text-label-primary h-screen overflow-hidden tracking-[0.01em]">
      <AppHeader
        profileInitials="VZ"
        profileToneClass={getUserAvatarTone("VZ")}
      />

      <main className="mx-auto grid h-[calc(100vh-64px)] w-full max-w-[1560px] grid-cols-1 gap-0 overflow-y-auto overscroll-contain xl:grid-cols-[340px_720px_340px]">
        <LeftNav
          items={navItems}
          activeSection={DEFAULT_ACTIVE_SECTION}
        />

        <section className="surface-primary border-separator min-w-0 border-l border-r-0">
          <FeedToolbar viewMode={viewMode} onViewModeChange={setViewMode} />

          <div className="pb-24">
            {feed.map((post) => (
              <article
                key={post.id}
                className="border-separator group relative cursor-pointer border-b"
              >
                <a
                  href="#"
                  className="absolute inset-0 z-0 cursor-pointer"
                  aria-label={post.content.title}
                />
                <div
                  className={`relative transition-colors group-hover:bg-[var(--fill-card-hover)] ${
                    viewMode === "forum" ? "px-5 py-3 sm:px-6" : "px-5 py-4 sm:px-6"
                  }`}
                >
                  <PostFeedItem
                    post={post}
                    viewMode={viewMode}
                    onToggleLike={toggleLike}
                    onToggleBookmark={toggleBookmark}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <LegalSidebar />
      </main>

    </div>
  );
}
