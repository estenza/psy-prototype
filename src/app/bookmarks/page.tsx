import { redirect } from "next/navigation";
import { AccountSectionShell } from "@/components/layout/account-section-shell";
import { HistoryPageHeader } from "@/components/layout/history-page-header";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import { ProfilePostsSection } from "@/features/feed/components/profile-posts-section";
import { listBookmarkedPostsByUserId } from "@/features/feed/lib/posts-repository";

export default async function BookmarksPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  const posts = await listBookmarkedPostsByUserId(currentUser.id, currentUser);

  return (
    <AccountSectionShell
      activeSection="bookmarks"
      header={<HistoryPageHeader title="Закладки" />}
      contentClassName="flex w-full min-w-0 flex-col gap-4"
    >
      <ProfilePostsSection
        emptyTitle="Пока нет закладок"
        emptyDescription="Добавляйте посты в закладки из ленты или со страницы поста, и они появятся здесь."
        flushTop
        initialPosts={posts}
        removeFromFeedWhenBookmarkRemoved
      />
    </AccountSectionShell>
  );
}
