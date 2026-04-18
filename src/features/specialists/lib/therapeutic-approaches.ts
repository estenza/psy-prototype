const THERAPEUTIC_APPROACH_TONE_NEUTRAL = "bg-[var(--fill-secondary)] text-[var(--label-secondary)]";
const THERAPEUTIC_APPROACH_TONE_SUCCESS = "bg-[var(--color-success-soft)] text-[var(--success)]";
const THERAPEUTIC_APPROACH_TONE_WARNING = "bg-[var(--color-warning-soft)] text-[var(--warning)]";
const THERAPEUTIC_APPROACH_TONE_DANGER = "bg-[var(--color-danger-soft)] text-[var(--accent-like)]";
const THERAPEUTIC_APPROACH_TONE_ACCENT = "bg-[var(--color-accent-soft)] text-[var(--accent-primary)]";

export const THERAPEUTIC_APPROACH_ENTITIES = [
  {
    id: "gestalt-therapy",
    label: "Гештальт-терапия",
    tone: THERAPEUTIC_APPROACH_TONE_NEUTRAL,
  },
  {
    id: "systemic-family-approach",
    label: "Системный семейный подход",
    tone: THERAPEUTIC_APPROACH_TONE_SUCCESS,
  },
  {
    id: "psychoanalytic-therapy",
    label: "Психоаналитическая терапия",
    tone: THERAPEUTIC_APPROACH_TONE_NEUTRAL,
  },
  {
    id: "body-oriented-psychotherapy",
    label: "Телесно-ориентированная психотерапия",
    tone: THERAPEUTIC_APPROACH_TONE_WARNING,
  },
  {
    id: "cbt",
    label: "КПТ",
    tone: THERAPEUTIC_APPROACH_TONE_WARNING,
  },
  {
    id: "existential-psychotherapy",
    label: "Экзистенциальная психотерапия",
    tone: THERAPEUTIC_APPROACH_TONE_NEUTRAL,
  },
  {
    id: "psychodrama",
    label: "Психодрама",
    tone: THERAPEUTIC_APPROACH_TONE_DANGER,
  },
  {
    id: "transactional-analysis",
    label: "Транзактный анализ",
    tone: THERAPEUTIC_APPROACH_TONE_ACCENT,
  },
  {
    id: "understanding-psychotherapy",
    label: "Понимающая психотерапия",
    tone: THERAPEUTIC_APPROACH_TONE_SUCCESS,
  },
  {
    id: "client-centered-approach",
    label: "Клиент-центрированный подход",
    tone: THERAPEUTIC_APPROACH_TONE_ACCENT,
  },
  {
    id: "symbol-drama",
    label: "Символдрама",
    tone: THERAPEUTIC_APPROACH_TONE_DANGER,
  },
  {
    id: "jungian-analysis",
    label: "Юнгианский анализ",
    tone: THERAPEUTIC_APPROACH_TONE_NEUTRAL,
  },
  {
    id: "positive-psychotherapy",
    label: "Позитивная психотерапия",
    tone: THERAPEUTIC_APPROACH_TONE_SUCCESS,
  },
] as const;

export type TherapeuticApproachEntity = (typeof THERAPEUTIC_APPROACH_ENTITIES)[number];
export type TherapeuticApproachLabel = TherapeuticApproachEntity["label"];

export const THERAPEUTIC_APPROACH_OPTIONS = THERAPEUTIC_APPROACH_ENTITIES.map(
  (approach) => approach.label,
) as TherapeuticApproachLabel[];

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
