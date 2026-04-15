export const THERAPEUTIC_APPROACH_ENTITIES = [
  {
    id: "gestalt-therapy",
    label: "Гештальт-терапия",
    tone: "bg-[var(--fill-secondary)] text-[var(--label-secondary)]",
  },
  {
    id: "systemic-family-approach",
    label: "Системный семейный подход",
    tone: "bg-[color-mix(in_srgb,var(--accent-success)_14%,transparent)] text-[var(--accent-success)]",
  },
  {
    id: "psychoanalytic-therapy",
    label: "Психоаналитическая терапия",
    tone: "bg-[var(--fill-secondary)] text-[var(--label-secondary)]",
  },
  {
    id: "body-oriented-psychotherapy",
    label: "Телесно-ориентированная психотерапия",
    tone: "bg-[color-mix(in_srgb,var(--accent-bookmark)_14%,transparent)] text-[var(--accent-bookmark)]",
  },
  {
    id: "cbt",
    label: "КПТ",
    tone: "bg-[color-mix(in_srgb,var(--accent-bookmark)_14%,transparent)] text-[var(--accent-bookmark)]",
  },
  {
    id: "existential-psychotherapy",
    label: "Экзистенциальная психотерапия",
    tone: "bg-[var(--fill-secondary)] text-[var(--label-secondary)]",
  },
  {
    id: "psychodrama",
    label: "Психодрама",
    tone: "bg-[color-mix(in_srgb,var(--accent-like)_14%,transparent)] text-[var(--accent-like)]",
  },
  {
    id: "transactional-analysis",
    label: "Транзактный анализ",
    tone: "bg-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)] text-[var(--accent-primary)]",
  },
  {
    id: "understanding-psychotherapy",
    label: "Понимающая психотерапия",
    tone: "bg-[color-mix(in_srgb,var(--accent-success)_14%,transparent)] text-[var(--accent-success)]",
  },
  {
    id: "client-centered-approach",
    label: "Клиент-центрированный подход",
    tone: "bg-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)] text-[var(--accent-primary)]",
  },
  {
    id: "symbol-drama",
    label: "Символдрама",
    tone: "bg-[color-mix(in_srgb,var(--accent-like)_14%,transparent)] text-[var(--accent-like)]",
  },
  {
    id: "jungian-analysis",
    label: "Юнгианский анализ",
    tone: "bg-[var(--fill-secondary)] text-[var(--label-secondary)]",
  },
  {
    id: "positive-psychotherapy",
    label: "Позитивная психотерапия",
    tone: "bg-[color-mix(in_srgb,var(--accent-success)_14%,transparent)] text-[var(--accent-success)]",
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
    ?? "bg-[var(--fill-secondary)] text-[var(--label-secondary)]";
}
