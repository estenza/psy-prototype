export type PostMenuActionId =
  | "edit"
  | "delete"
  | "follow"
  | "show-less"
  | "save"
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
    label: "Удалить обсуждение",
  },
] as const satisfies ReadonlyArray<{
  icon: "delete" | "edit";
  id: PostMenuActionId;
  label: string;
}>;

export const COMMUNITY_POST_MENU_ACTIONS = [
  {
    id: "follow",
    icon: "bell",
    label: "Следить за постом",
  },
  {
    id: "show-less",
    icon: "eye-off",
    label: "Меньше похожих постов",
  },
  {
    id: "save",
    icon: "bookmark",
    label: "Сохранить",
  },
  {
    id: "hide",
    icon: "eye-off",
    label: "Скрыть",
  },
  {
    id: "report",
    icon: "flag",
    label: "Пожаловаться",
  },
] as const satisfies ReadonlyArray<{
  icon: "bell" | "bookmark" | "eye-off" | "flag";
  id: PostMenuActionId;
  label: string;
}>;
