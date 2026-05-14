export type NavigationItemKey =
  | "forum"
  | "psychologists"
  | "profile"
  | "bookmarks"
  | "drafts"
  | "settings"
  | "for-psychologists";

export type NavigationItem = {
  href: string;
  name: string;
  key: NavigationItemKey;
  guestOnly?: boolean;
  requiresAuth?: boolean;
};
