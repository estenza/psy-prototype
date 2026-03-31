export type PostMenuActionId =
  | "edit"
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
] as const satisfies ReadonlyArray<{
  icon: "edit";
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
    tone: "danger",
  },
] as const satisfies ReadonlyArray<{
  icon: "bell" | "bookmark" | "eye-off" | "flag";
  id: PostMenuActionId;
  label: string;
  tone?: "default" | "danger";
}>;
