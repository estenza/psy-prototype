import type { NavigationItem, NavigationItemKey } from "@/types/navigation";

export const DEFAULT_ACTIVE_SECTION: NavigationItemKey = "forum";

export const navItems: readonly NavigationItem[] = [
  { name: "Главная", key: "forum", href: "/" },
  { name: "Психологи", key: "psychologists", href: "/psychologists" },
  { name: "Профиль", key: "profile", href: "/profile", requiresAuth: true },
  { name: "Закладки", key: "bookmarks", href: "/bookmarks", requiresAuth: true },
  { name: "Черновики", key: "drafts", href: "/drafts", requiresAuth: true },
  { name: "Настройки", key: "settings", href: "/settings", requiresAuth: true },
] as const;

export function isNavigationItemCurrent(
  pathname: string | null,
  item: Pick<NavigationItem, "href">,
) {
  if (item.href === "#") {
    return false;
  }

  if (item.href === "/") {
    return pathname === "/";
  }

  return pathname === item.href || pathname?.startsWith(`${item.href}/`);
}
