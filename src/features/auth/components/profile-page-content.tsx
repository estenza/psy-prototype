import Link from "next/link";
import { AccountSectionShell } from "@/components/layout/account-section-shell";
import { HistoryPageHeader } from "@/components/layout/history-page-header";
import { ProfileActivityTabs } from "@/features/auth/components/profile-activity-tabs";
import { ProfileMoreMenu } from "@/features/auth/components/profile-more-menu";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { getUserHandle } from "@/features/auth/lib/profile";
import type { AuthUser } from "@/features/auth/types";
import type { ProfileCommentItem } from "@/features/comments/types";
import type { Post } from "@/features/feed/types";

export function ProfilePageContent({
  favoritePosts,
  posts,
  profilePath,
  replies,
  user,
  viewerIsOwner,
}: {
  favoritePosts: Post[];
  posts: Post[];
  profilePath: string;
  replies: ProfileCommentItem[];
  user: AuthUser;
  viewerIsOwner: boolean;
}) {
  const profileHandle = getUserHandle(user);
  const profileMetaLinkClassName =
    "rounded-none p-0 no-underline transition-[text-decoration-color] duration-100 ease-out hover:underline focus-visible:underline decoration-[color:var(--underline-primary)] decoration-[1.5px] underline-offset-4";

  return (
    <AccountSectionShell
      activeSection="profile"
      contentClassName="flex w-full min-w-0 flex-col gap-0"
      header={<HistoryPageHeader alwaysUseFallback title="Профиль" />}
      sectionClassName="w-full min-w-0"
    >
      <section className="surface-elevated relative rounded-[28px] p-6">
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

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
              <Link
                href={`${profilePath}?view=followers`}
                className={`${profileMetaLinkClassName} text-[16px] leading-6 text-[var(--label-primary)]`.trim()}
              >
                <span className="font-medium">0</span> подписчиков
              </Link>
              <Link
                href={`${profilePath}?view=following`}
                className={`${profileMetaLinkClassName} text-[16px] leading-6 text-[var(--label-primary)]`.trim()}
              >
                <span className="font-medium">0</span> подписок
              </Link>
            </div>

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
