export const ADMIN_SPECIALTY_OPTIONS = [
  "КПТ",
  "Гештальт-терапия",
  "Психоанализ",
  "Схематерапия",
  "ACT",
  "DBT",
  "EMDR",
  "Семейная терапия",
  "Клиент-центрированная терапия",
  "Экзистенциальная терапия",
  "Арт-терапия",
  "Телесно-ориентированная терапия",
] as const;

export type AdminSpecialty = (typeof ADMIN_SPECIALTY_OPTIONS)[number];

const ADMIN_SPECIALTY_COLOR_MAP: Record<AdminSpecialty, string> = {
  "ACT": "bg-[rgba(34,197,94,0.16)] text-[rgb(21,128,61)]",
  "DBT": "bg-[rgba(20,184,166,0.16)] text-[rgb(13,148,136)]",
  "EMDR": "bg-[rgba(59,130,246,0.16)] text-[rgb(29,78,216)]",
  "КПТ": "bg-[rgba(249,115,22,0.16)] text-[rgb(194,65,12)]",
  "Арт-терапия": "bg-[rgba(236,72,153,0.16)] text-[rgb(190,24,93)]",
  "Гештальт-терапия": "bg-[rgba(168,85,247,0.16)] text-[rgb(126,34,206)]",
  "Клиент-центрированная терапия": "bg-[rgba(14,165,233,0.16)] text-[rgb(3,105,161)]",
  "Психоанализ": "bg-[rgba(99,102,241,0.16)] text-[rgb(67,56,202)]",
  "Семейная терапия": "bg-[rgba(132,204,22,0.16)] text-[rgb(77,124,15)]",
  "Схематерапия": "bg-[rgba(244,63,94,0.16)] text-[rgb(190,18,60)]",
  "Телесно-ориентированная терапия": "bg-[rgba(245,158,11,0.16)] text-[rgb(180,83,9)]",
  "Экзистенциальная терапия": "bg-[rgba(107,114,128,0.16)] text-[rgb(75,85,99)]",
};

export function normalizeAdminSpecialties(input: string[] | null | undefined) {
  const allowedValues = new Set<string>(ADMIN_SPECIALTY_OPTIONS);
  const seenValues = new Set<string>();

  return (input ?? [])
    .map((value) => value.trim())
    .filter((value) => allowedValues.has(value) && !seenValues.has(value))
    .map((value) => {
      seenValues.add(value);
      return value as AdminSpecialty;
    });
}

export function getAdminSpecialtyTone(specialty: string) {
  return ADMIN_SPECIALTY_COLOR_MAP[specialty as AdminSpecialty]
    ?? "bg-[rgba(100,116,139,0.16)] text-[rgb(71,85,105)]";
}
