import { sanitizeProfileText } from "@/features/auth/lib/profile";
import type {
  SpecialistAttachedDocument,
  SpecialistDocumentStatus,
  SpecialistEducationItem,
} from "@/features/auth/types";

export const SPECIALIST_EDUCATION_MAX_ITEMS = 12;
export const SPECIALIST_EDUCATION_YEAR_MAX_LENGTH = 32;
export const SPECIALIST_EDUCATION_INSTITUTION_MAX_LENGTH = 360;
export const SPECIALIST_EDUCATION_STUDYING_NOW_VALUE = "Учится сейчас";
const SPECIALIST_DOCUMENT_STATUSES = new Set<SpecialistDocumentStatus>([
  "pending_review",
  "verified",
  "rejected",
]);

function normalizeOptionalProfileText(value: unknown) {
  return sanitizeProfileText(typeof value === "string" ? value : "");
}

function normalizeEducationKind(value: unknown): SpecialistEducationItem["kind"] | undefined {
  return value === "education" || value === "training" || value === "supervision"
    ? value
    : undefined;
}

function normalizeEducationStatus(value: unknown): SpecialistEducationItem["status"] | undefined {
  return value === "completed" || value === "in_progress" ? value : undefined;
}

function normalizeDocumentStatus(value: unknown) {
  return typeof value === "string" && SPECIALIST_DOCUMENT_STATUSES.has(value as SpecialistDocumentStatus)
    ? value as SpecialistDocumentStatus
    : "pending_review";
}

function normalizeSpecialistDocument(value: unknown): SpecialistAttachedDocument | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = normalizeOptionalProfileText(record.id);
  const name = normalizeOptionalProfileText(record.name);
  const mimeType = normalizeOptionalProfileText(record.mimeType);
  const previewUrl = typeof record.previewUrl === "string" ? record.previewUrl.trim() : "";
  const url = typeof record.url === "string" ? record.url.trim() : "";
  const size = typeof record.size === "number" && Number.isFinite(record.size)
    ? Math.max(0, Math.round(record.size))
    : 0;

  if (!id || !name || !mimeType || !url) {
    return null;
  }

  return {
    id,
    name,
    mimeType,
    previewUrl: previewUrl || undefined,
    size,
    status: normalizeDocumentStatus(record.status),
    url,
    moderationComment: normalizeOptionalProfileText(record.moderationComment) || null,
    verifiedAt: normalizeOptionalProfileText(record.verifiedAt) || null,
  };
}

function getEducationYearSortValue(year: string) {
  const normalizedYear = year.trim();

  if (normalizedYear === SPECIALIST_EDUCATION_STUDYING_NOW_VALUE) {
    return Number.POSITIVE_INFINITY;
  }

  const numericYear = Number(normalizedYear);

  return Number.isFinite(numericYear) ? numericYear : Number.NEGATIVE_INFINITY;
}

export function sortSpecialistEducation(
  education: SpecialistEducationItem[],
): SpecialistEducationItem[] {
  return education
    .map((item, index) => ({
      index,
      item,
      sortValue: getEducationYearSortValue(item.year),
    }))
    .sort((itemA, itemB) => (
      itemB.sortValue - itemA.sortValue || itemA.index - itemB.index
    ))
    .map(({ item }) => item);
}

export function normalizeSpecialistEducation(
  value: unknown,
): SpecialistEducationItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedItems: SpecialistEducationItem[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const itemRecord = item as Record<string, unknown>;
    const year = normalizeOptionalProfileText(itemRecord.year);
    const institution = normalizeOptionalProfileText(itemRecord.institution);
    const documents = Array.isArray(itemRecord.documents)
      ? itemRecord.documents
          .map(normalizeSpecialistDocument)
          .filter((document): document is SpecialistAttachedDocument => Boolean(document))
      : [];

    if (!year && !institution) {
      continue;
    }

    normalizedItems.push({
      id: normalizeOptionalProfileText(itemRecord.id) || undefined,
      kind: normalizeEducationKind(itemRecord.kind),
      type: normalizeOptionalProfileText(itemRecord.type) || undefined,
      year,
      institution,
      program: normalizeOptionalProfileText(itemRecord.program) || undefined,
      qualification: normalizeOptionalProfileText(itemRecord.qualification) || undefined,
      approach: normalizeOptionalProfileText(itemRecord.approach) || undefined,
      status: normalizeEducationStatus(itemRecord.status),
      academicHours: normalizeOptionalProfileText(itemRecord.academicHours) || undefined,
      documents,
    });
  }

  return sortSpecialistEducation(normalizedItems).slice(0, SPECIALIST_EDUCATION_MAX_ITEMS);
}

export function parseSpecialistEducationJson(value: string | null | undefined) {
  if (!value?.trim()) {
    return [] as SpecialistEducationItem[];
  }

  try {
    return normalizeSpecialistEducation(JSON.parse(value) as unknown);
  } catch {
    return [];
  }
}
