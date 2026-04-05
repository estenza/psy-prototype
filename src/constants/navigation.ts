import type { NavigationItem, NavigationItemKey } from "@/types/navigation";

export const DEFAULT_ACTIVE_SECTION: NavigationItemKey = "forum";

export const navItems: readonly NavigationItem[] = [
  { name: "Обсуждения", key: "forum", href: "/" },
  { name: "Психологи", key: "psychologists", href: "#" },
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
