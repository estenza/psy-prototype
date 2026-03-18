import type { NavigationItem, NavigationItemKey } from "@/types/navigation";

export const DEFAULT_ACTIVE_SECTION: NavigationItemKey = "forum";

export const navItems: readonly NavigationItem[] = [
  { name: "Форум", key: "forum" },
  { name: "Читать", key: "blogs" },
  { name: "Психологи", key: "psychologists" },
] as const;
