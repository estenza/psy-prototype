import type { PostIntent } from "@/types/post-taxonomy";
import type {
  TopicDraft,
  TopicDraftFields,
  TopicFieldKey,
  TopicFormat,
} from "@/features/topic-creation/types";

export const TOPIC_TITLE_MAX_LENGTH = 100;
export const TOPIC_TITLE_WARNING_THRESHOLD = 20;

export const DEFAULT_TOPIC_FORMAT: TopicFormat = "opinions";

export const EMPTY_TOPIC_DRAFT_FIELDS: TopicDraftFields = {
  primary: "",
  secondary: "",
  tertiary: "",
};

export const EMPTY_TOPIC_DRAFT: TopicDraft = {
  content: "",
  editingPostId: null,
  fields: { ...EMPTY_TOPIC_DRAFT_FIELDS },
  format: DEFAULT_TOPIC_FORMAT,
  guestEmail: "",
  intent: "discussion",
  topic: "free-topic",
  title: "",
  updatedAt: null,
};

export const TOPIC_FORMAT_OPTIONS: TopicFormat[] = [
  "opinions",
  "specialists",
  "vent",
  "demo-consultation",
];

export type TopicFormatFieldConfig = {
  key: TopicFieldKey;
  label: string;
  optional?: boolean;
  placeholder: string;
  rows?: number;
};

export const TOPIC_FORMAT_META: Record<
  TopicFormat,
  {
    description: string;
    fields: TopicFormatFieldConfig[];
    label: string;
    legacyIntent: PostIntent;
  }
> = {
  opinions: {
    label: "Мнения",
    description: "Публичное обсуждение с пользователями и психологами",
    legacyIntent: "discussion",
    fields: [
      {
        key: "primary",
        label: "Коротко о ситуации",
        placeholder: "Например: не могу отпустить расставание уже три месяца",
        rows: 2,
      },
      {
        key: "secondary",
        label: "Что хотите обсудить",
        placeholder: "Что именно хочется услышать от людей: опыт, взгляд со стороны, идеи",
        rows: 4,
      },
      {
        key: "tertiary",
        label: "Что думаете сами",
        optional: true,
        placeholder: "Если хотите, добавьте, к каким выводам вы уже пришли",
        rows: 3,
      },
    ],
  },
  specialists: {
    label: "Взгляд психологов",
    description: "Публичная тема с акцентом на ответы специалистов",
    legacyIntent: "discussion",
    fields: [
      {
        key: "primary",
        label: "Ваш вопрос",
        placeholder: "Сформулируйте главный вопрос так, как задали бы его специалисту",
        rows: 2,
      },
      {
        key: "secondary",
        label: "Контекст ситуации",
        placeholder: "Что происходит, как давно это длится и что в этом особенно важно",
        rows: 4,
      },
      {
        key: "tertiary",
        label: "Что хотите понять или решить",
        placeholder: "Какой ясности или следующего шага вам сейчас не хватает",
        rows: 3,
      },
    ],
  },
  vent: {
    label: "Выговориться",
    description: "Свободный формат, когда важно просто выговориться и быть услышанным",
    legacyIntent: "discussion",
    fields: [
      {
        key: "primary",
        label: "Что произошло",
        placeholder: "Коротко: что случилось или что накопилось",
        rows: 2,
      },
      {
        key: "secondary",
        label: "Что вы сейчас чувствуете",
        placeholder: "Можно писать как есть, без попытки всё объяснить правильно",
        rows: 4,
      },
      {
        key: "tertiary",
        label: "Какой отклик вам был бы полезен",
        optional: true,
        placeholder: "Например: просто поддержка, бережный взгляд со стороны или тишина без советов",
        rows: 3,
      },
    ],
  },
  "demo-consultation": {
    label: "Демо-консультация",
    description: "Публичный асинхронный тет-а-тет с выбранным психологом",
    legacyIntent: "support",
    fields: [
      {
        key: "primary",
        label: "С чем хотите обратиться",
        placeholder: "Коротко сформулируйте главный запрос",
        rows: 2,
      },
      {
        key: "secondary",
        label: "Что важно знать о ситуации",
        placeholder: "Опишите, что происходит и какие детали помогут лучше вас понять",
        rows: 4,
      },
      {
        key: "tertiary",
        label: "Чего ожидаете от консультации",
        placeholder: "Что для вас было бы полезным результатом этого разговора",
        rows: 3,
      },
    ],
  },
};
