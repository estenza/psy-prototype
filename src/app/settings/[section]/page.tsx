import { redirect } from "next/navigation";
import { SettingsRouteScreen } from "@/features/auth/components/settings-route-screen";
import { getCurrentUser } from "@/features/auth/lib/current-user";
import {
  DEFAULT_SETTINGS_SECTION,
  findPrivacyAndSafetySubsection,
  findSettingsSection,
} from "@/features/auth/lib/settings-navigation";

type SettingsSectionPageProps = {
  params: Promise<{
    section: string;
  }>;
};

export default async function SettingsSectionPage({
  params,
}: SettingsSectionPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  const { section: sectionId } = await params;
  const section = findSettingsSection(sectionId);
  const privacyAndSafetySubsection = findPrivacyAndSafetySubsection(sectionId);

  if (!section && !privacyAndSafetySubsection) {
    redirect(DEFAULT_SETTINGS_SECTION.href);
  }

  return (
    <SettingsRouteScreen
      activePrivacyAndSafetySubsectionId={privacyAndSafetySubsection?.id}
      activeSectionId={section?.id ?? "privacy_and_safety"}
      currentUser={currentUser}
    />
  );
}
