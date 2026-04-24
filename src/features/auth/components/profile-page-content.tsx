import Link from "next/link";
import { AccountSectionShell } from "@/components/layout/account-section-shell";
import { HistoryPageHeader } from "@/components/layout/history-page-header";
import { MoreMenuButton } from "@/components/ui/more-menu-button";
import { ProfileActivityTabs } from "@/features/auth/components/profile-activity-tabs";
import { UserAvatar } from "@/features/auth/components/user-avatar";
import { getUserHandle, resolveOnboardingStep } from "@/features/auth/lib/profile";
import type { AuthUser } from "@/features/auth/types";
import type { ProfileCommentItem } from "@/features/comments/types";
import type { Post } from "@/features/feed/types";

export function ProfilePageContent({
  discussions,
  profilePath,
  replies,
  user,
  viewerIsOwner,
}: {
  discussions: Post[];
  profilePath: string;
  replies: ProfileCommentItem[];
  user: AuthUser;
  viewerIsOwner: boolean;
}) {
  const currentStep = resolveOnboardingStep(user);
  const profileHandle = user.nickname ? getUserHandle(user) : "Псевдоним пока не выбран";
  const profileMetaLinkClassName =
    "rounded-none p-0 no-underline transition-[text-decoration-color] duration-100 ease-out hover:underline focus-visible:underline decoration-[color:var(--underline-primary)] decoration-[1.5px] underline-offset-4";

  return (
    <AccountSectionShell
      contentClassName="flex w-full min-w-0 flex-col gap-0"
      header={<HistoryPageHeader />}
      sectionClassName="w-full min-w-0"
    >
      <section className="rounded-[28px] px-5 pt-4 pb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <UserAvatar
            avatarUrl={user.avatarUrl}
            name={user.displayName}
            size="profile-xl"
          />

          <div className="min-w-0">
            <div className="inline-flex max-w-full items-start gap-1">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="type-feed-title truncate text-[var(--label-primary)]">
                  {user.displayName}
                </h2>
                <p className="truncate text-[14px] leading-5 text-[var(--label-tertiary)]">
                  {profileHandle}
                </p>
              </div>

              <MoreMenuButton
                ariaLabel="Еще"
                className="interactive-tertiary button--blur-no-focus button--icon-only !inline-flex h-9 w-9 min-w-9 shrink-0 rounded-full px-0 text-[var(--label-primary)]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
              <Link
                href={`${profilePath}?view=followers`}
                className={`${profileMetaLinkClassName} text-[14px] leading-5 text-[var(--label-primary)]`.trim()}
              >
                <span className="font-medium">0</span> подписчиков
              </Link>
              <Link
                href={`${profilePath}?view=following`}
                className={`${profileMetaLinkClassName} text-[14px] leading-5 text-[var(--label-primary)]`.trim()}
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
        <section className="surface-elevated border-separator rounded-[28px] border p-6">
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
        discussions={discussions}
        displayName={user.displayName}
        replies={replies}
        viewerIsOwner={viewerIsOwner}
      />

      {viewerIsOwner && currentStep !== "complete" ? (
        <section className="surface-elevated border-separator rounded-[28px] border p-6">
          <h2 className="text-[18px] font-semibold text-[var(--label-primary)]">
            Профиль ещё не завершён
          </h2>
          <p className="text-[14px] leading-6 text-[var(--label-secondary)]">
            Чтобы профиль выглядел законченным, осталось пройти следующий шаг онбординга.
          </p>
          <div>
            <Link
              href={`/complete-profile?next=${encodeURIComponent(profilePath)}`}
              className="interactive-secondary inline-flex items-center rounded-full px-4 py-2.5 text-sm font-semibold"
            >
              Продолжить оформление
            </Link>
          </div>
        </section>
      ) : null}
    </AccountSectionShell>
  );
}
