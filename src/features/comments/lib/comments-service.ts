import "server-only";

import { getUserHandle } from "@/features/auth/lib/profile";
import type { SessionUser } from "@/features/auth/types";
import { getInitials } from "@/features/comments/lib/comment-format";
import {
  CommentsRepositoryError,
  createDiscussionComment,
  deleteDiscussionComment,
  getDiscussionCommentsSection,
  listDiscussionCommentReports,
  moderateDiscussionComment,
  reportDiscussionComment,
  updateDiscussionComment,
  setDiscussionCommentVote,
} from "@/features/comments/lib/comments-repository";
import type {
  AdminModerateCommentPayload,
  CommentsCapabilities,
  CommentsSortValue,
  CommentsViewer,
} from "@/features/comments/types";

export class CommentsServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CommentsServiceError";
    this.status = status;
  }
}

function buildAnonymousViewer(): CommentsViewer {
  return {
    avatarUrl: null,
    displayName: "Гость",
    handle: "@guest",
    initials: "Г",
    hyvorUserHtid: null,
    kind: "anonymous",
    isAuthenticated: false,
  };
}

function buildAuthenticatedViewer(currentUser: SessionUser): CommentsViewer {
  return {
    avatarUrl: currentUser.avatarUrl,
    displayName: currentUser.displayName,
    handle: getUserHandle(currentUser),
    initials: getInitials(currentUser.displayName),
    hyvorUserHtid: null,
    kind: "sso",
    isAuthenticated: true,
  };
}

export function buildCommentsViewer(currentUser: SessionUser | null): CommentsViewer {
  return currentUser ? buildAuthenticatedViewer(currentUser) : buildAnonymousViewer();
}

export function buildCommentsCapabilities(currentUser: SessionUser | null): CommentsCapabilities {
  const canInteract = Boolean(currentUser && !currentUser.isBanned);
  const limitations = [
    "Для MVP поддерживается только один уровень ответов.",
    "Редактирование и удаление комментариев в пользовательском UI пока не подключены, хотя backend уже подготовлен.",
  ];

  return {
    canRead: true,
    canPost: canInteract,
    canReply: canInteract,
    canVote: canInteract,
    canReport: canInteract,
    canEditOwnComments: false,
    canDeleteOwnComments: false,
    authMode: currentUser ? "sso" : "unknown",
    editorMode: "custom-plain",
    postDisabledReason:
      currentUser?.isBanned
        ? "Комментирование для этого аккаунта временно недоступно."
        : currentUser
          ? null
          : "Нужно войти в аккаунт, чтобы комментировать обсуждения.",
    limitations,
  };
}

export function parseDiscussionPageId(pageId: string) {
  const normalizedPageId = pageId.trim();

  if (!normalizedPageId.startsWith("discussion:")) {
    throw new CommentsServiceError("Комментарии сейчас поддерживаются только для обсуждений.", 400);
  }

  const discussionId = normalizedPageId.slice("discussion:".length).trim();

  if (!discussionId) {
    throw new CommentsServiceError("Не удалось определить обсуждение для комментариев.", 400);
  }

  return discussionId;
}

function toServiceError(error: unknown) {
  if (error instanceof CommentsServiceError || error instanceof CommentsRepositoryError) {
    return error;
  }

  console.error("[comments-service]", error);
  return new CommentsServiceError("Внутренняя ошибка комментариев.", 500);
}

export async function getCommentsSection(params: {
  currentUser: SessionUser | null;
  pageId: string;
  sort: CommentsSortValue;
}) {
  try {
    const discussionId = parseDiscussionPageId(params.pageId);
    const viewer = buildCommentsViewer(params.currentUser);
    const capabilities = buildCommentsCapabilities(params.currentUser);

    return await getDiscussionCommentsSection({
      capabilities,
      currentUser: params.currentUser,
      discussionId,
      pageId: params.pageId,
      sort: params.sort,
      viewer,
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function createComment(params: {
  body: string;
  currentUser: SessionUser | null;
  pageId: string;
  parentId?: string | null;
}) {
  try {
    if (!params.currentUser) {
      throw new CommentsServiceError(
        "Нужно войти в аккаунт, чтобы комментировать обсуждения.",
        401,
      );
    }

    return await createDiscussionComment({
      actor: params.currentUser,
      body: params.body,
      discussionId: parseDiscussionPageId(params.pageId),
      parentId: params.parentId ?? null,
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function voteComment(params: {
  commentId: string;
  currentUser: SessionUser | null;
  type: "up" | "down" | null;
}) {
  try {
    if (!params.currentUser) {
      throw new CommentsServiceError("Нужно войти в аккаунт, чтобы ставить лайки.", 401);
    }

    await setDiscussionCommentVote({
      actor: params.currentUser,
      commentId: params.commentId,
      type: params.type,
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function reportComment(params: {
  commentId: string;
  currentUser: SessionUser | null;
  reason?: string | null;
}) {
  try {
    if (!params.currentUser) {
      throw new CommentsServiceError("Нужно войти в аккаунт, чтобы отправлять жалобы.", 401);
    }

    await reportDiscussionComment({
      actor: params.currentUser,
      commentId: params.commentId,
      reason: params.reason,
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function editComment(params: {
  body: string;
  commentId: string;
  currentUser: SessionUser | null;
}) {
  try {
    if (!params.currentUser) {
      throw new CommentsServiceError("Нужно войти в аккаунт, чтобы редактировать комментарии.", 401);
    }

    await updateDiscussionComment({
      actor: params.currentUser,
      body: params.body,
      commentId: params.commentId,
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function removeComment(params: {
  commentId: string;
  currentUser: SessionUser | null;
}) {
  try {
    if (!params.currentUser) {
      throw new CommentsServiceError("Нужно войти в аккаунт, чтобы удалять комментарии.", 401);
    }

    await deleteDiscussionComment({
      actor: params.currentUser,
      commentId: params.commentId,
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function getAdminCommentReports() {
  try {
    return await listDiscussionCommentReports();
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function moderateComment(params: {
  commentId: string;
  currentUser: SessionUser | null;
  payload: AdminModerateCommentPayload;
}) {
  try {
    if (!params.currentUser) {
      throw new CommentsServiceError("Нужно войти в аккаунт, чтобы модерировать комментарии.", 401);
    }

    await moderateDiscussionComment({
      action: params.payload.action,
      actor: params.currentUser,
      commentId: params.commentId,
      reason: params.payload.reason,
    });
  } catch (error) {
    throw toServiceError(error);
  }
}
