export type NavigationItemKey =
  | "forum"
  | "psychologists"
  | "profile"
  | "bookmarks"
  | "drafts"
  | "settings";

export type NavigationItem = {
  href: string;
  name: string;
  key: NavigationItemKey;
  requiresAuth?: boolean;
};
