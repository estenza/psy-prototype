export const SETTINGS_SECTIONS = [
  {
    id: "account",
    href: "/settings/account",
    title: "Настройки учетной записи",
  },
  {
    id: "security_and_account_access",
    href: "/settings/security_and_account_access",
    title: "Безопасность и доступ к учетной записи",
  },
  {
    id: "privacy_and_safety",
    href: "/settings/privacy_and_safety",
    title: "Конфиденциальность и безопасность",
  },
  {
    id: "notifications",
    href: "/settings/notifications",
    title: "Уведомления",
  },
  {
    id: "appearance",
    href: "/settings/appearance",
    title: "Оформление",
  },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

export const DEFAULT_SETTINGS_SECTION = SETTINGS_SECTIONS[0];

export function findSettingsSection(sectionId: string | null | undefined) {
  return SETTINGS_SECTIONS.find((section) => section.id === sectionId) ?? null;
}

export const PRIVACY_AND_SAFETY_SUBSECTIONS = [
  {
    description:
      "Определите, что вы хотите видеть, на основе своих предпочтений, таких как интересы.",
    id: "content_you_see",
    href: "/settings/content_you_see",
    title: "Контент, который вы видите",
  },
  {
    description:
      "Управляйте игнорируемыми или внесенными в черный список учетными записями, словами и уведомлениями.",
    id: "ignored_and_blocked",
    href: "/settings/ignored_and_blocked",
    title: "Игнорируемые и черный список",
  },
  {
    description: "Выбирайте, кто может отправлять вам личные сообщения.",
    id: "chat",
    href: "/settings/chat",
    title: "Чат",
  },
] as const;

export type PrivacyAndSafetySubsectionId = (typeof PRIVACY_AND_SAFETY_SUBSECTIONS)[number]["id"];

export function findPrivacyAndSafetySubsection(
  subsectionId: string | null | undefined,
) {
  return PRIVACY_AND_SAFETY_SUBSECTIONS.find((subsection) => subsection.id === subsectionId) ?? null;
}
