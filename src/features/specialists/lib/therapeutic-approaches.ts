const THERAPEUTIC_APPROACH_TONE_NEUTRAL = "bg-[var(--fill-secondary)] text-[var(--label-secondary)]";
const THERAPEUTIC_APPROACH_TONE_SUCCESS = "bg-[var(--color-success-soft)] text-[var(--success)]";
const THERAPEUTIC_APPROACH_TONE_WARNING = "bg-[var(--color-warning-soft)] text-[var(--warning)]";
const THERAPEUTIC_APPROACH_TONE_DANGER = "bg-[var(--color-danger-soft)] text-[var(--accent-like)]";
const THERAPEUTIC_APPROACH_TONE_ACCENT = "bg-[var(--color-accent-soft)] text-[var(--accent-primary)]";

export const THERAPEUTIC_APPROACH_ENTITIES = [
  {
    id: "gestalt-therapy",
    label: "Гештальт-терапия",
    description: "Помогает замечать чувства, потребности и реакции в настоящем моменте, чтобы лучше понимать себя и свои выборы.",
    tone: THERAPEUTIC_APPROACH_TONE_NEUTRAL,
  },
  {
    id: "systemic-family-approach",
    label: "Системный семейный подход",
    description: "Рассматривает трудности человека через отношения, роли и правила внутри семьи или другой важной системы.",
    tone: THERAPEUTIC_APPROACH_TONE_SUCCESS,
  },
  {
    id: "psychoanalytic-therapy",
    label: "Психоаналитическая терапия",
    description: "Исследует повторяющиеся переживания, внутренние конфликты и ранний опыт, которые могут влиять на сегодняшнюю жизнь.",
    tone: THERAPEUTIC_APPROACH_TONE_NEUTRAL,
  },
  {
    id: "body-oriented-psychotherapy",
    label: "Телесно-ориентированная психотерапия",
    description: "Работает со связью эмоций, напряжения и телесных ощущений, помогая бережно возвращать контакт с собой.",
    tone: THERAPEUTIC_APPROACH_TONE_WARNING,
  },
  {
    id: "cbt",
    label: "КПТ",
    description: "Помогает находить устойчивые мысли и поведенческие привычки, проверять их и постепенно менять на более полезные.",
    tone: THERAPEUTIC_APPROACH_TONE_WARNING,
  },
  {
    id: "existential-psychotherapy",
    label: "Экзистенциальная психотерапия",
    description: "Фокусируется на смысле, свободе, ответственности, одиночестве и выборе в важных жизненных ситуациях.",
    tone: THERAPEUTIC_APPROACH_TONE_NEUTRAL,
  },
  {
    id: "psychodrama",
    label: "Психодрама",
    description: "Использует действие, роли и сценическое проигрывание ситуаций, чтобы увидеть опыт с новых сторон.",
    tone: THERAPEUTIC_APPROACH_TONE_DANGER,
  },
  {
    id: "transactional-analysis",
    label: "Транзактный анализ",
    description: "Разбирает сценарии общения и привычные роли, чтобы сделать отношения и решения более осознанными.",
    tone: THERAPEUTIC_APPROACH_TONE_ACCENT,
  },
  {
    id: "understanding-psychotherapy",
    label: "Понимающая психотерапия",
    description: "Ставит в центр внимательное понимание переживаний человека и поиск личного смысла происходящего.",
    tone: THERAPEUTIC_APPROACH_TONE_SUCCESS,
  },
  {
    id: "client-centered-approach",
    label: "Клиент-центрированный подход",
    description: "Опирается на принятие, эмпатию и уважение к опыту клиента, создавая пространство для естественных изменений.",
    tone: THERAPEUTIC_APPROACH_TONE_ACCENT,
  },
  {
    id: "symbol-drama",
    label: "Символдрама",
    description: "Работает с образами и воображением, помогая мягко исследовать чувства, конфликты и внутренние ресурсы.",
    tone: THERAPEUTIC_APPROACH_TONE_DANGER,
  },
  {
    id: "jungian-analysis",
    label: "Юнгианский анализ",
    description: "Исследует сны, символы и личные смыслы, чтобы лучше понять внутренние процессы и путь развития.",
    tone: THERAPEUTIC_APPROACH_TONE_NEUTRAL,
  },
  {
    id: "positive-psychotherapy",
    label: "Позитивная психотерапия",
    description: "Помогает видеть не только проблему, но и способности, ценности и ресурсы, на которые можно опереться.",
    tone: THERAPEUTIC_APPROACH_TONE_SUCCESS,
  },
] as const;

export type TherapeuticApproachEntity = (typeof THERAPEUTIC_APPROACH_ENTITIES)[number];
export type TherapeuticApproachLabel = TherapeuticApproachEntity["label"];

export const THERAPEUTIC_APPROACH_OPTIONS = THERAPEUTIC_APPROACH_ENTITIES.map(
  (approach) => approach.label,
) as TherapeuticApproachLabel[];
export const THERAPEUTIC_APPROACH_MAX_SELECTED = 3;

const THERAPEUTIC_APPROACH_BY_LABEL = new Map(
  THERAPEUTIC_APPROACH_ENTITIES.map((approach) => [approach.label, approach] as const),
);

const LEGACY_THERAPEUTIC_APPROACH_LABEL_MAP: Record<string, TherapeuticApproachLabel> = {
  "Психоанализ": "Психоаналитическая терапия",
  "Семейная терапия": "Системный семейный подход",
  "Клиент-центрированная терапия": "Клиент-центрированный подход",
  "Экзистенциальная терапия": "Экзистенциальная психотерапия",
  "Телесно-ориентированная терапия": "Телесно-ориентированная психотерапия",
};

export function normalizeTherapeuticApproaches(input: string[] | null | undefined) {
  const seenValues = new Set<string>();

  return (input ?? [])
    .map((value) => {
      const normalizedValue = value.trim();
      return LEGACY_THERAPEUTIC_APPROACH_LABEL_MAP[normalizedValue] ?? normalizedValue;
    })
    .filter((value) => THERAPEUTIC_APPROACH_BY_LABEL.has(value) && !seenValues.has(value))
    .map((value) => {
      seenValues.add(value);
      return value as TherapeuticApproachLabel;
    });
}

export function getTherapeuticApproachTone(approach: string) {
  return THERAPEUTIC_APPROACH_BY_LABEL.get(approach as TherapeuticApproachLabel)?.tone
    ?? THERAPEUTIC_APPROACH_TONE_NEUTRAL;
}

export function getTherapeuticApproachDescription(approach: string) {
  return THERAPEUTIC_APPROACH_BY_LABEL.get(approach as TherapeuticApproachLabel)?.description
    ?? "Короткое описание этого подхода появится позже.";
}
