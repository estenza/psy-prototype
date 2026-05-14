import "server-only";

import { banAdminManagedUser } from "@/features/admin/lib/admin-service";
import { canModerateContent } from "@/features/auth/lib/permissions";
import type { SessionUser } from "@/features/auth/types";
import { moderatePostComment } from "@/features/comments/lib/comments-repository";
import { moderatePost } from "@/features/feed/lib/posts-repository";
import {
  countUncheckedContentReportsByType,
  createPostReport,
  findContentReportById,
  listContentReports,
  ReportsRepositoryError,
  updateContentReportStatus,
} from "@/features/reports/lib/reports-repository";
import {
  REPORT_REASON_LABELS,
  isContentReportReason,
} from "@/features/reports/lib/report-copy";
import type {
  AdminReportAction,
  AdminReportsFilters,
  ContentReportObjectType,
  ContentReportReason,
  ContentReportStatus,
} from "@/features/reports/types";

const REPORT_STATUS_VALUES = new Set<ContentReportStatus>([
  "action_taken",
  "dismissed",
  "open",
  "reviewed",
]);

const REPORT_OBJECT_TYPE_VALUES = new Set<ContentReportObjectType>([
  "comment",
  "post",
]);

const ADMIN_REPORT_ACTION_VALUES = new Set<AdminReportAction>([
  "ban-author",
  "delete-content",
  "dismiss",
  "hide-content",
  "mark-reviewed",
]);

export class ReportsServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReportsServiceError";
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function toServiceError(error: unknown) {
  if (error instanceof ReportsServiceError || error instanceof ReportsRepositoryError) {
    return error;
  }

  console.error("[reports-service]", error);
  return new ReportsServiceError("Внутренняя ошибка жалоб.", 500);
}

export function normalizeAdminReportsFilters(input: {
  objectType?: string | null;
  reason?: string | null;
  search?: string | null;
  status?: string | null;
}): AdminReportsFilters {
  const statusCandidate = input.status as ContentReportStatus | "all" | null | undefined;
  const objectTypeCandidate = input.objectType as ContentReportObjectType | "all" | null | undefined;
  const reasonCandidate = input.reason as ContentReportReason | "all" | null | undefined;

  return {
    objectType:
      objectTypeCandidate && REPORT_OBJECT_TYPE_VALUES.has(objectTypeCandidate as ContentReportObjectType)
        ? objectTypeCandidate as ContentReportObjectType
        : "all",
    reason:
      reasonCandidate && isContentReportReason(reasonCandidate)
        ? reasonCandidate
        : "all",
    search: input.search?.trim().slice(0, 120) ?? "",
    status:
      statusCandidate && REPORT_STATUS_VALUES.has(statusCandidate as ContentReportStatus)
        ? statusCandidate as ContentReportStatus
        : "all",
  };
}

export async function submitPostReport(params: {
  currentUser: SessionUser | null;
  details?: string | null;
  postId: string;
  reason?: string | null;
}) {
  try {
    if (!params.currentUser) {
      throw new ReportsServiceError("Нужно войти в аккаунт, чтобы отправить жалобу.", 401);
    }

    if (!isContentReportReason(params.reason)) {
      throw new ReportsServiceError("Выберите причину жалобы.", 400);
    }

    await createPostReport({
      actor: params.currentUser,
      details: params.details,
      postId: params.postId,
      reason: params.reason,
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function getAdminReports(filters: AdminReportsFilters) {
  try {
    return await listContentReports(filters);
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function getUncheckedAdminReportsCounts() {
  try {
    return await countUncheckedContentReportsByType();
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function applyAdminReportAction(params: {
  action: AdminReportAction;
  actor: SessionUser | null;
  reportId: string;
}) {
  try {
    if (!params.actor || !canModerateContent(params.actor)) {
      throw new ReportsServiceError("Недостаточно прав для работы с жалобами.", 403);
    }

    if (!ADMIN_REPORT_ACTION_VALUES.has(params.action)) {
      throw new ReportsServiceError("Недопустимое действие по жалобе.", 400);
    }

    const report = await findContentReportById(params.reportId);

    if (params.action === "mark-reviewed") {
      await updateContentReportStatus({
        actor: params.actor,
        reportId: params.reportId,
        status: "reviewed",
      });
      return;
    }

    if (params.action === "dismiss") {
      await updateContentReportStatus({
        actor: params.actor,
        reportId: params.reportId,
        status: "dismissed",
      });
      return;
    }

    if (params.action === "ban-author") {
      await banAdminManagedUser(params.actor, report.contentAuthor.id, {
        reason: `Жалоба: ${REPORT_REASON_LABELS[report.reason]}`,
      });
      await updateContentReportStatus({
        actor: params.actor,
        reportId: params.reportId,
        status: "action_taken",
      });
      return;
    }

    const action = params.action === "delete-content" ? "delete" : "hide";
    const reason = `Жалоба: ${REPORT_REASON_LABELS[report.reason]}`;

    if (report.objectType === "post") {
      if (!report.postId) {
        throw new ReportsServiceError("Не удалось найти пост для жалобы.", 404);
      }

      await moderatePost({
        action,
        actor: params.actor,
        postId: report.postId,
        reason,
      });
    } else {
      if (!report.commentId) {
        throw new ReportsServiceError("Не удалось найти комментарий для жалобы.", 404);
      }

      await moderatePostComment({
        action,
        actor: params.actor,
        commentId: report.commentId,
        reason,
      });
    }

    await updateContentReportStatus({
      actor: params.actor,
      reportId: params.reportId,
      status: "action_taken",
    });
  } catch (error) {
    throw toServiceError(error);
  }
}
