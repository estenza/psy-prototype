import type {
  AdminReportAction,
  ContentReportReason,
  ContentReportStatus,
  ContentReportObjectType,
} from "@/features/reports/types";

export const REPORT_REASONS = [
  { value: "spam", label: "Спам" },
  { value: "abuse", label: "Оскорбления" },
  { value: "illegal", label: "Нарушение закона" },
  { value: "pornography", label: "Порнографический контент" },
  { value: "violence", label: "Насилие" },
  { value: "misleading", label: "Введение в заблуждение" },
  { value: "politics", label: "Политика" },
  { value: "other", label: "Другое" },
] as const satisfies ReadonlyArray<{
  label: string;
  value: ContentReportReason;
}>;

export const REPORT_REASON_LABELS = Object.fromEntries(
  REPORT_REASONS.map((reason) => [reason.value, reason.label]),
) as Record<ContentReportReason, string>;

export const REPORT_STATUS_LABELS = {
  action_taken: "Приняты меры",
  dismissed: "Проверено",
  open: "Открыта",
  reviewed: "Открыта",
} as const satisfies Record<ContentReportStatus, string>;

export const REPORT_OBJECT_TYPE_LABELS = {
  comment: "Комментарий",
  post: "Пост",
} as const satisfies Record<ContentReportObjectType, string>;

export const ADMIN_REPORT_ACTIONS = [
  "hide-content",
  "dismiss",
  "delete-content",
  "ban-author",
] as const satisfies ReadonlyArray<AdminReportAction>;

export const ADMIN_REPORT_ACTION_LABELS = {
  "ban-author": "Забанить автора",
  "delete-content": "Удалить контент",
  dismiss: "Проверено",
  "hide-content": "Скрыть контент",
  "mark-reviewed": "Открыта",
} as const satisfies Record<AdminReportAction, string>;

export function isContentReportReason(value: unknown): value is ContentReportReason {
  return REPORT_REASONS.some((reason) => reason.value === value);
}
