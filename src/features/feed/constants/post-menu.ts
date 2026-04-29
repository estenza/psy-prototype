export type PostMenuActionId =
  | "edit"
  | "delete"
  | "follow-author"
  | "follow"
  | "show-less"
  | "profile-favorite"
  | "hide"
  | "report";

export const OWN_POST_MENU_ACTIONS = [
  {
    id: "edit",
    icon: "edit",
    label: "Редактировать",
  },
  {
    id: "delete",
    icon: "delete",
    label: "Удалить пост",
  },
] as const satisfies ReadonlyArray<{
  icon: "delete" | "edit";
  id: PostMenuActionId;
  label: string;
}>;

export const COMMUNITY_POST_MENU_ACTIONS = [
  {
    id: "show-less",
    icon: "eye-off",
    label: "Меньше похожих постов",
  },
  {
    id: "follow-author",
    icon: "person-plus",
    label: "Начать читать автора",
  },
  {
    id: "follow",
    icon: "bell",
    label: "Следить за постом",
  },
  {
    id: "profile-favorite",
    icon: "bookmark",
    label: "Добавить в Избранное",
  },
  {
    id: "hide",
    icon: "ignore",
    label: "Игнорировать автора",
  },
  {
    id: "report",
    icon: "flag",
    label: "Пожаловаться",
  },
] as const satisfies ReadonlyArray<{
  icon: "bell" | "bookmark" | "eye-off" | "flag" | "ignore" | "person-plus";
  id: PostMenuActionId;
  label: string;
}>;
