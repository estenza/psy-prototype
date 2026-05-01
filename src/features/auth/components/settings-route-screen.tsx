import { AppHeader } from "@/components/layout/app-header";
import { DesktopAppShell } from "@/components/layout/desktop-app-shell";
import {
  SettingsDesktopRedirect,
  SettingsMenuContent,
  SettingsPageContent,
} from "@/features/auth/components/settings-page-content";
import { listIgnoredAuthors } from "@/features/auth/lib/ignored-authors-repository";
import { getViewerNotificationPreferences } from "@/features/notifications/lib/notifications-service";
import type {
  PrivacyAndSafetySubsectionId,
  SettingsSectionId,
} from "@/features/auth/lib/settings-navigation";
import type { SessionUser } from "@/features/auth/types";

type SettingsRouteScreenProps = {
  activePrivacyAndSafetySubsectionId?: PrivacyAndSafetySubsectionId;
  activeSectionId: SettingsSectionId;
  currentUser: SessionUser;
};

type SettingsMenuRouteScreenProps = {
  activePrivacyAndSafetySubsectionId?: PrivacyAndSafetySubsectionId;
  activeSectionId?: SettingsSectionId | null;
};

export function SettingsMenuRouteScreen({
  activePrivacyAndSafetySubsectionId,
  activeSectionId = null,
}: SettingsMenuRouteScreenProps) {
  return (
    <div className="surface-primary text-label-primary min-h-[100svh] min-[481px]:min-h-dvh">
      <SettingsDesktopRedirect />
      <AppHeader />

      <div className="min-[481px]:pt-[var(--app-header-height)]">
        <DesktopAppShell
          activeSection="settings"
          centerClassName="w-full max-w-[672px]"
          fitCenterToContent
          showRightSidebar={false}
        >
          <SettingsMenuContent
            activePrivacyAndSafetySubsectionId={activePrivacyAndSafetySubsectionId}
            activeSectionId={activeSectionId}
          />
        </DesktopAppShell>
      </div>
    </div>
  );
}

export async function SettingsRouteScreen({
  activePrivacyAndSafetySubsectionId,
  activeSectionId,
  currentUser,
}: SettingsRouteScreenProps) {
  const [ignoredAuthors, notificationPreferences] = await Promise.all([
    listIgnoredAuthors(currentUser.id),
    getViewerNotificationPreferences(currentUser),
  ]);

  return (
    <div className="surface-primary text-label-primary min-h-[100svh] min-[481px]:min-h-dvh">
      <AppHeader />

      <div className="min-[481px]:pt-[var(--app-header-height)]">
        <DesktopAppShell
          activeSection="settings"
          centerClassName="settings-primary-column w-full"
          compactMenuWidth="narrow"
          fitCenterToContent
          showRightSidebar={false}
        >
          <SettingsPageContent
            activePrivacyAndSafetySubsectionId={activePrivacyAndSafetySubsectionId}
            activeSectionId={activeSectionId}
            currentUser={currentUser}
            ignoredAuthors={ignoredAuthors}
            notificationPreferences={notificationPreferences}
          />
        </DesktopAppShell>
      </div>
    </div>
  );
}
