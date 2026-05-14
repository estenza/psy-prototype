import { AccountSectionShell } from "@/components/layout/account-section-shell";
import { HistoryPageHeader } from "@/components/layout/history-page-header";
import { ProfileActivityTabs } from "@/features/auth/components/profile-activity-tabs";
import { ProfileFollowPanel } from "@/features/auth/components/profile-follow-panel";
import { ProfileFollowsModal } from "@/features/auth/components/profile-follows-modal";
import { ProfileHeaderActions } from "@/features/auth/components/profile-header-actions";
import {
  ProfileAboutSection,
  ProfileContactsSection,
  ProfileEducationSection,
  ProfileTherapyMethodsSection,
  ProfileWorkTopicsSection,
} from "@/features/auth/components/profile-info-section";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { VerifiedSpecialistIcon } from "@/components/ui/icons";
import { formatUserLastSeenLabel } from "@/features/auth/lib/user-presence";
import { getUserHandle } from "@/features/auth/lib/profile";
import type {
  AuthUser,
  AuthorFollowListUser,
  AuthorFollowSummary,
} from "@/features/auth/types";
import type { ProfileCommentItem } from "@/features/comments/types";
import type { Post } from "@/features/feed/types";

type ProfilePrimaryColumnProps = {
  favoritePosts: Post[];
  followers: AuthorFollowListUser[];
  followSummary: AuthorFollowSummary;
  following: AuthorFollowListUser[];
  posts: Post[];
  profilePath: string;
  replies: ProfileCommentItem[];
  user: AuthUser;
  viewerIsOwner: boolean;
};

export function ProfilePrimaryColumn({
  favoritePosts,
  followers,
  followSummary,
  following,
  posts,
  profilePath,
  replies,
  user,
  viewerIsOwner,
}: ProfilePrimaryColumnProps) {
  const profileHandle = getUserHandle(user);
  const isSpecialist = user.role === "specialist";
  const isVerifiedSpecialist = user.role === "specialist"
    && user.specialistStatus === "verified";
  const profileDescription = user.profileDescription?.trim() ?? "";
  const profileActionsTopClassName = isSpecialist
    ? "top-[148px] min-[480px]:top-[180px]"
    : "top-4 min-[480px]:top-6";

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <section className="surface-elevated overflow-hidden rounded-[28px]">
        {!isSpecialist ? (
          <div
            aria-hidden="true"
            className={`h-[200px] bg-[color-mix(in_oklab,var(--accent-primary)_18%,var(--background-elevated))] ${
              user.profileCoverUrl ? "bg-cover bg-center" : ""
            }`.trim()}
            style={
              user.profileCoverUrl
                ? { backgroundImage: `url(${user.profileCoverUrl})` }
                : undefined
            }
          />
        ) : null}

        <div className="relative p-4 min-[480px]:p-6">
          <div className={`absolute right-4 z-20 min-[480px]:right-6 ${profileActionsTopClassName}`}>
            <ProfileHeaderActions
              avatarSeed={user.nickname || user.id}
              avatarSourceUrl={user.avatarSourceUrl}
              avatarUrl={user.avatarUrl}
              displayName={user.displayName}
              profileCoverUrl={user.profileCoverUrl}
              profileDescription={user.profileDescription}
              profilePath={profilePath}
              showProfileCover={!isSpecialist}
              userHandle={profileHandle}
              userId={user.id}
              viewerIsOwner={viewerIsOwner}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className={`relative z-10 ${isSpecialist ? "" : "-mt-[72px] min-[480px]:-mt-[92px]"}`.trim()}>
              <UserAvatar
                avatarUrl={user.avatarUrl}
                avatarSeed={user.nickname || user.id}
                name={user.displayName}
                outerBorderClassName="shadow-[0_0_0_4px_#fff]"
                size="profile-xl"
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col pr-12">
              <div className="inline-flex max-w-full items-start gap-1">
                <div className="flex min-w-0 flex-col gap-0">
                  <h1 className="type-h1 inline-flex max-w-full items-center gap-1 font-semibold text-[var(--label-primary)]">
                    <span className="min-w-0 truncate">{user.displayName}</span>
                    {isVerifiedSpecialist ? <VerifiedSpecialistIcon size={24} /> : null}
                  </h1>
                  {!isSpecialist ? (
                    <p className="truncate text-[16px] leading-6 text-[var(--label-tertiary)]">
                      {profileHandle}
                    </p>
                  ) : null}
                  <p className="truncate text-[14px] leading-5 text-[var(--label-tertiary)]">
                    {formatUserLastSeenLabel(user.updatedAt)}
                  </p>
                </div>

              </div>

              <ProfileFollowPanel
                followedUserId={user.id}
                initialSummary={followSummary}
                actionTopClassName={profileActionsTopClassName}
                profilePath={profilePath}
                userHandle={profileHandle}
                viewerIsOwner={viewerIsOwner}
              >
                {profileDescription && user.role !== "specialist" ? (
                  <p className="pt-4 whitespace-pre-wrap text-[16px] leading-6 text-[var(--label-primary)]">
                    {profileDescription}
                  </p>
                ) : null}
              </ProfileFollowPanel>
            </div>
          </div>
        </div>
      </section>

      {user.role === "specialist" && profileDescription ? (
        <ProfileAboutSection description={profileDescription} />
      ) : null}

      {user.role === "specialist" ? (
        <ProfileEducationSection education={user.education} />
      ) : null}

      {user.specialties.length > 0 ? (
        <ProfileTherapyMethodsSection specialties={user.specialties} />
      ) : null}

      {user.role === "specialist" ? (
        <ProfileWorkTopicsSection workTopics={user.workTopics} />
      ) : null}

      {user.role === "specialist" ? (
        <ProfileContactsSection
          specialistTelegramUrl={user.specialistTelegramUrl}
          specialistMaxUrl={user.specialistMaxUrl}
          specialistWhatsappUrl={user.specialistWhatsappUrl}
        />
      ) : null}

      <ProfileActivityTabs
        posts={posts}
        favoritePosts={favoritePosts}
        displayName={user.displayName}
        replies={replies}
        viewerIsOwner={viewerIsOwner}
      />
      <ProfileFollowsModal followers={followers} following={following} />
    </div>
  );
}

export function ProfilePageContent(props: ProfilePrimaryColumnProps) {
  return (
    <AccountSectionShell
      activeSection={props.viewerIsOwner ? "profile" : null}
      contentClassName="flex w-full min-w-0 flex-col gap-0"
      header={<HistoryPageHeader alwaysUseFallback title="Профиль" />}
      sectionClassName="w-full min-w-0"
    >
      <ProfilePrimaryColumn {...props} />
    </AccountSectionShell>
  );
}
