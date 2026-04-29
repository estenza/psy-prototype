"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { ThemePreferenceCard } from "@/components/theme/theme-preference-card";
import { IgnoreAuthorIcon } from "@/components/ui/icons";
import { AuthField } from "@/features/auth/components/auth-field";
import { IgnoredAuthorsSettingsCard } from "@/features/auth/components/ignored-authors-settings-card";
import { SettingsDeleteAccountButton } from "@/features/auth/components/settings-delete-account-button";
import { SettingsSignOutButton } from "@/features/auth/components/settings-sign-out-button";
import { NotificationPreferencesCard } from "@/features/notifications/components/notification-preferences-card";
import { BackNavigationButton } from "@/features/topic-creation/components/back-navigation-button";
import {
  DEFAULT_SETTINGS_SECTION,
  PRIVACY_AND_SAFETY_SUBSECTIONS,
  SETTINGS_SECTIONS,
} from "@/features/auth/lib/settings-navigation";
import type {
  PrivacyAndSafetySubsectionId,
  SettingsSectionId,
} from "@/features/auth/lib/settings-navigation";
import type {
  IgnoredAuthorSummary,
  NotificationPreferences,
  SessionUser,
} from "@/features/auth/types";

type SettingsPageContentProps = {
  activePrivacyAndSafetySubsectionId?: PrivacyAndSafetySubsectionId;
  activeSectionId: SettingsSectionId;
  currentUser: SessionUser;
  ignoredAuthors: IgnoredAuthorSummary[];
  notificationPreferences: NotificationPreferences;
};

type SettingsMenuContentProps = {
  activePrivacyAndSafetySubsectionId?: PrivacyAndSafetySubsectionId;
  activeSectionId: SettingsSectionId;
};

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M6 3.5L10.5 8L6 12.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PrivacyChatIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M6 8C6.55228 8 7 8.44772 7 9C7 9.55228 6.55228 10 6 10C5.44772 10 5 9.55228 5 9C5 8.44772 5.44772 8 6 8Z"
        fill="currentColor"
      />
      <path
        d="M10 8C10.5523 8 11 8.44772 11 9C11 9.55228 10.5523 10 10 10C9.44772 10 9 9.55228 9 9C9 8.44772 9.44772 8 10 8Z"
        fill="currentColor"
      />
      <path
        d="M14 8C14.5523 8 15 8.44772 15 9C15 9.55228 14.5523 10 14 10C13.4477 10 13 9.55228 13 9C13 8.44772 13.4477 8 14 8Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14 2.41602C16.6234 2.41602 18.75 4.54364 18.75 7.16699V10.6934C18.7497 13.3165 16.6232 15.4434 14 15.4434H6.02734C5.85672 15.4434 5.69072 15.5016 5.55762 15.6084L2.46973 18.0859C2.24484 18.2662 1.93568 18.3013 1.67578 18.1768C1.416 18.0521 1.25037 17.7891 1.25 17.501V7.16699C1.25 4.54364 3.37665 2.41602 6 2.41602H14ZM6 3.91699C4.20507 3.91699 2.75 5.37207 2.75 7.16699V15.9365L4.61914 14.4385C5.01845 14.1182 5.51547 13.9434 6.02734 13.9434H14C15.7947 13.9434 17.2497 12.488 17.25 10.6934V7.16699C17.25 5.37207 15.7949 3.91699 14 3.91699H6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PrivacyContentIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.8496 2C16.1416 2 18 3.85841 18 6.15039V13.8496C18 16.1416 16.1416 18 13.8496 18H6.15039C3.85841 18 2 16.1416 2 13.8496V6.15039C2 3.85841 3.85841 2 6.15039 2H13.8496ZM3.5 8V13.8496C3.5 15.3132 4.68684 16.5 6.15039 16.5H13.8496C15.3132 16.5 16.5 15.3132 16.5 13.8496V8H3.5ZM6.15039 3.5C4.68684 3.5 3.5 4.68684 3.5 6.15039V6.5H16.5V6.15039C16.5 4.68684 15.3132 3.5 13.8496 3.5H6.15039Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PrivacyAndSafetySubsectionIcon({
  subsectionId,
}: {
  subsectionId: PrivacyAndSafetySubsectionId;
}) {
  if (subsectionId === "ignored_and_blocked") {
    return <IgnoreAuthorIcon />;
  }

  if (subsectionId === "chat") {
    return <PrivacyChatIcon />;
  }

  return <PrivacyContentIcon />;
}

function SettingsPlaceholderCard({ title }: { title: string }) {
  return (
    <section className="surface-elevated rounded-[28px] p-6">
      <h3 className="text-[18px] font-semibold text-[var(--label-primary)]">
        {title}
      </h3>
      <div className="mt-5 rounded-[20px] bg-[var(--fill-control-subtle)] px-4 py-4 text-[14px] text-[var(--label-secondary)]">
        Содержимое подраздела появится здесь.
      </div>
    </section>
  );
}

function EmptySettingsSection({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <section className="surface-elevated rounded-[28px] p-6">
      <h2 className="text-[18px] font-semibold text-[var(--label-primary)]">
        {title}
      </h2>
      <p className="mt-2 max-w-[620px] text-[14px] leading-6 text-[var(--label-secondary)]">
        {description}
      </p>
      <div className="mt-5 rounded-[20px] bg-[var(--fill-control-subtle)] px-4 py-4 text-[14px] text-[var(--label-secondary)]">
        Раздел уже добавлен в структуру настроек.
      </div>
    </section>
  );
}

function PrivacyAndSafetySubsectionList() {
  return (
    <section className="surface-elevated overflow-hidden rounded-[28px]">
      <nav aria-label="Подразделы конфиденциальности и безопасности" className="p-2">
        {PRIVACY_AND_SAFETY_SUBSECTIONS.map((subsection) => (
          <Link
            key={subsection.id}
            href={subsection.href}
            className="flex min-h-[96px] w-full items-center justify-between gap-3 rounded-[18px] px-3 py-3.5 text-left text-[var(--label-primary)] transition-colors hover:bg-[var(--fill-quaternary)]"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center text-[var(--label-tertiary)]">
                <PrivacyAndSafetySubsectionIcon subsectionId={subsection.id} />
              </span>
              <span className="flex min-w-0 flex-col justify-center">
                <span className="block text-[16px] font-medium leading-6">
                  {subsection.title}
                </span>
                <span className="mt-1 block text-[14px] leading-5 text-[var(--label-secondary)]">
                  {subsection.description}
                </span>
              </span>
            </span>
            <span className="flex-none text-[var(--label-tertiary)]">
              <ChevronRightIcon />
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}

export function SettingsMenuContent({
  activePrivacyAndSafetySubsectionId,
  activeSectionId,
}: SettingsMenuContentProps) {
  const activeNavigationSectionId = activePrivacyAndSafetySubsectionId
    ? "privacy_and_safety"
    : activeSectionId;

  return (
    <div className="w-full px-4 py-6 min-[481px]:py-8">
      <header className="pb-5 pl-1">
        <h1 className="text-[22px] font-semibold leading-7 text-[var(--label-primary)]">
          Настройки
        </h1>
      </header>

      <div className="surface-elevated overflow-hidden rounded-[28px]">
        <nav aria-label="Разделы настроек" className="p-2">
          {SETTINGS_SECTIONS.map((section) => {
            const isActive = section.id === activeNavigationSectionId;

            return (
              <Link
                key={section.id}
                href={section.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center justify-between gap-3 rounded-[18px] px-3 py-3.5 text-left transition-colors ${
                  isActive
                    ? "bg-[var(--fill-selected-subtle)] text-[var(--label-primary)]"
                    : "text-[var(--label-primary)] hover:bg-[var(--fill-quaternary)]"
                }`.trim()}
              >
                <span className="min-w-0">
                  <span className="block text-[16px] font-medium leading-6">
                    {section.title}
                  </span>
                </span>
                <span className={`flex-none text-[var(--label-tertiary)] ${
                  isActive ? "text-[var(--label-primary)]" : ""
                }`.trim()}>
                  <ChevronRightIcon />
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function SettingsPageContent({
  activePrivacyAndSafetySubsectionId,
  activeSectionId,
  currentUser,
  ignoredAuthors,
  notificationPreferences,
}: SettingsPageContentProps) {
  const router = useRouter();
  const [email, setEmail] = useState(currentUser.email);
  const activeSection = SETTINGS_SECTIONS.find((section) => section.id === activeSectionId)
    ?? DEFAULT_SETTINGS_SECTION;
  const activePrivacyAndSafetySubsection = PRIVACY_AND_SAFETY_SUBSECTIONS.find(
    (subsection) => subsection.id === activePrivacyAndSafetySubsectionId,
  );

  function handlePrivacyAndSafetyBack() {
    startTransition(() => {
      router.push("/settings/privacy_and_safety");
    });
  }

  return (
    <section className="w-full min-w-0 py-6 min-[481px]:py-8">
      <div className="mb-6 min-[1140px]:hidden">
        <SettingsMenuContent
          activePrivacyAndSafetySubsectionId={activePrivacyAndSafetySubsectionId}
          activeSectionId={activeSectionId}
        />
      </div>

      <div className="min-w-0">
        <header className="pb-5 pl-1">
          {activePrivacyAndSafetySubsection ? (
            <div className="flex items-center gap-3">
              <BackNavigationButton onClick={handlePrivacyAndSafetyBack} />
              <h2 className="min-w-0 text-[22px] font-semibold leading-7 text-[var(--label-primary)]">
                {activePrivacyAndSafetySubsection.title}
              </h2>
            </div>
          ) : (
            <h2 className="text-[22px] font-semibold leading-7 text-[var(--label-primary)]">
              {activeSection.title}
            </h2>
          )}
        </header>

        <div className="flex flex-col gap-6">
          {activeSectionId === "account" ? (
            <section className="surface-elevated rounded-[28px] p-6">
              <div>
                <h3 className="text-[18px] font-semibold text-[var(--label-primary)]">
                  Учетная запись
                </h3>
                <div className="mt-5 max-w-[420px]">
                  <AuthField
                    name="settings-email"
                    type="email"
                    label="Email"
                    placeholder="Email"
                    value={email}
                    onChange={setEmail}
                    autoComplete="email"
                  />
                </div>
                <div className="mt-5">
                  <SettingsSignOutButton />
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-[18px] font-semibold text-[var(--label-primary)]">
                  Отключение аккаунта
                </h3>
                <p className="type-body-relaxed mt-2 max-w-[620px] text-[var(--label-tertiary)]">
                  Отключение аккаунта скрывает ваш аккаунт, ваши посты и ответы от других пользователей.
                  Аккаунт и его данные можно будет восстановить в течение 30 дней после отключения.
                </p>
                <div className="mt-5">
                  <SettingsDeleteAccountButton />
                </div>
              </div>
            </section>
          ) : null}

          {activeSectionId === "security_and_account_access" ? (
            <EmptySettingsSection
              title="Доступ к аккаунту"
              description="Здесь появятся устройства, активные сессии и дополнительные способы защиты входа."
            />
          ) : null}

          {activeSectionId === "privacy_and_safety" && !activePrivacyAndSafetySubsection ? (
            <PrivacyAndSafetySubsectionList />
          ) : null}

          {activePrivacyAndSafetySubsectionId === "ignored_and_blocked" ? (
            <IgnoredAuthorsSettingsCard initialAuthors={ignoredAuthors} />
          ) : null}

          {activePrivacyAndSafetySubsectionId === "chat" ? (
            <SettingsPlaceholderCard title="Чат" />
          ) : null}

          {activePrivacyAndSafetySubsectionId === "content_you_see" ? (
            <SettingsPlaceholderCard title="Контент, который вы видите" />
          ) : null}

          {activeSectionId === "notifications" ? (
            <NotificationPreferencesCard initialPreferences={notificationPreferences} />
          ) : null}

          {activeSectionId === "appearance" ? (
            <ThemePreferenceCard />
          ) : null}
        </div>
      </div>
    </section>
  );
}
