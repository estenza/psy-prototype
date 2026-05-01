import { AccountSectionShell } from "@/components/layout/account-section-shell";
import { HistoryPageHeader } from "@/components/layout/history-page-header";
import { ProfileActivityTabs } from "@/features/auth/components/profile-activity-tabs";
import { ProfileFollowPanel } from "@/features/auth/components/profile-follow-panel";
import { ProfileMoreMenu } from "@/features/auth/components/profile-more-menu";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { getUserHandle } from "@/features/auth/lib/profile";
import type { AuthUser, AuthorFollowSummary } from "@/features/auth/types";
import type { ProfileCommentItem } from "@/features/comments/types";
import type { Post } from "@/features/feed/types";

export function ProfilePageContent({
  favoritePosts,
  followSummary,
  posts,
  profilePath,
  replies,
  user,
  viewerIsOwner,
}: {
  favoritePosts: Post[];
  followSummary: AuthorFollowSummary;
  posts: Post[];
  profilePath: string;
  replies: ProfileCommentItem[];
  user: AuthUser;
  viewerIsOwner: boolean;
}) {
  const profileHandle = getUserHandle(user);

  return (
    <AccountSectionShell
      activeSection={viewerIsOwner ? "profile" : null}
      contentClassName="flex w-full min-w-0 flex-col gap-0"
      header={<HistoryPageHeader alwaysUseFallback title="Профиль" />}
      sectionClassName="w-full min-w-0"
    >
      <section
        className={`surface-elevated relative rounded-[28px] p-6 ${viewerIsOwner ? "" : "pb-20"}`.trim()}
      >
        <div className="absolute right-6 top-6">
          <ProfileMoreMenu
            profilePath={profilePath}
            userHandle={profileHandle}
            userId={user.id}
            viewerIsOwner={viewerIsOwner}
          />
        </div>

        <div className="flex flex-col gap-6 min-[481px]:flex-row min-[481px]:items-start">
          <UserAvatar
            avatarUrl={user.avatarUrl}
            avatarSeed={user.nickname || user.id}
            name={user.displayName}
            size="profile-xl"
          />

          <div className="min-w-0 pr-12">
            <div className="inline-flex max-w-full items-start gap-1">
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="truncate text-[24px] font-semibold leading-8 text-[var(--label-primary)]">
                  {user.displayName}
                </h1>
                <p className="truncate text-[16px] leading-6 text-[var(--label-tertiary)]">
                  {profileHandle}
                </p>
              </div>

            </div>

            <ProfileFollowPanel
              followedUserId={user.id}
              initialSummary={followSummary}
              profilePath={profilePath}
              userHandle={profileHandle}
              viewerIsOwner={viewerIsOwner}
            />

            {user.profileDescription ? (
              <p className="pt-4 whitespace-pre-wrap text-[14px] leading-6 text-[var(--label-primary)]">
                {user.profileDescription}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {user.specialties.length > 0 ? (
        <section className="surface-elevated rounded-[28px] p-6">
          <h2 className="text-[18px] font-semibold text-[var(--label-primary)]">
            Подходы и темы
          </h2>
          <div className="flex flex-wrap gap-2">
            {user.specialties.map((specialty) => (
              <span
                key={specialty}
                className="rounded-full bg-[var(--fill-control-subtle)] px-3 py-1.5 text-[14px] leading-5 text-[var(--label-primary)]"
              >
                {specialty}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <ProfileActivityTabs
        posts={posts}
        favoritePosts={favoritePosts}
        displayName={user.displayName}
        replies={replies}
        viewerIsOwner={viewerIsOwner}
      />
    </AccountSectionShell>
  );
}
