import "server-only";

import { randomUUID } from "node:crypto";
import { execAuthPostgres, isPostgresAuthEnabled, queryAuthPostgres } from "@/lib/auth-postgres";
import { getDatabase } from "@/lib/db";
import { canDeleteOwnComment, canModerateContent } from "@/features/auth/lib/permissions";
import { getUserHandle } from "@/features/auth/lib/profile";
import type { SessionUser } from "@/features/auth/types";
import {
  buildCommentHtml,
  escapeHtml,
  formatRelativeDate,
  formatRelativeDateCompact,
  getCommentContentTextLength,
  getInitials,
  hasCommentBodyContent,
  stripHtml,
} from "@/features/comments/lib/comment-format";
import type {
  AdminCommentReportItem,
  CommentAuthor,
  CommentNode,
  CommentsCapabilities,
  CommentsSectionData,
  CommentsSortValue,
  CommentsViewer,
} from "@/features/comments/types";

type CommentStatus = "published" | "hidden" | "deleted" | "pending";
type CommentReportStatus = "open" | "reviewed" | "dismissed" | "resolved";

type DiscussionSummaryRow = {
  id: string;
  title: string;
};

type DiscussionCommentRow = {
  id: string;
  discussion_id: string;
  author_user_id: string;
  parent_comment_id: string | null;
  root_comment_id: string | null;
  depth: number;
  body_html: string;
  body_text: string;
  status: CommentStatus;
  hidden_reason: string | null;
  likes_count: number;
  replies_count: number;
  reports_count: number;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  hidden_at: string | null;
  deleted_at: string | null;
  author_display_name: string;
  author_nickname: string | null;
  author_avatar_url: string | null;
  viewer_liked: boolean | number | null;
};

type DiscussionCommentBaseRow = {
  id: string;
  discussion_id: string;
  author_user_id: string;
  parent_comment_id: string | null;
  root_comment_id: string | null;
  depth: number;
  created_at: string;
  status: CommentStatus;
};

type CommentAuthorMentionRow = {
  display_name: string;
  nickname: string | null;
};

type DiscussionCommentReportRow = {
  id: string;
  status: CommentReportStatus;
  reason: string | null;
  created_at: string;
  updated_at: string;
  comment_id: string;
  comment_body_text: string;
  comment_status: CommentStatus;
  discussion_id: string;
  discussion_title: string;
  comment_author_id: string;
  comment_author_display_name: string;
  comment_author_nickname: string | null;
  comment_author_avatar_url: string | null;
  reporter_user_id: string;
  reporter_display_name: string;
  reporter_nickname: string | null;
  reporter_avatar_url: string | null;
};

type CreateDiscussionCommentInput = {
  actor: SessionUser;
  body: string;
  discussionId: string;
  parentId?: string | null;
};

type UpdateDiscussionCommentInput = {
  actor: SessionUser;
  body: string;
  commentId: string;
};

type ModerateDiscussionCommentInput = {
  action: "hide" | "restore" | "delete";
  actor: SessionUser;
  commentId: string;
  reason?: string | null;
};

const COMMENT_BODY_MAX_LENGTH = 5000;
const COMMENT_BODY_HTML_MAX_LENGTH = 300_000;
const COMMENT_REPORT_REASON_MAX_LENGTH = 500;
const COMMENT_EDIT_WINDOW_MS = 15 * 60 * 1000;
const COMMENT_MAX_THREAD_DEPTH = 2;

const PG_DISCUSSION_COMMENT_COLUMNS = `
  discussion_comments.id,
  discussion_comments.discussion_id,
  discussion_comments.author_user_id,
  discussion_comments.parent_comment_id,
  discussion_comments.root_comment_id,
  discussion_comments.depth,
  discussion_comments.body_html,
  discussion_comments.body_text,
  discussion_comments.status,
  discussion_comments.hidden_reason,
  discussion_comments.likes_count,
  discussion_comments.replies_count,
  discussion_comments.reports_count,
  discussion_comments.created_at::text AS created_at,
  discussion_comments.updated_at::text AS updated_at,
  discussion_comments.edited_at::text AS edited_at,
  discussion_comments.hidden_at::text AS hidden_at,
  discussion_comments.deleted_at::text AS deleted_at,
  users.display_name AS author_display_name,
  users.nickname AS author_nickname,
  users.avatar_url AS author_avatar_url
`;

const SQLITE_DISCUSSION_COMMENT_COLUMNS = `
  discussion_comments.id,
  discussion_comments.discussion_id,
  discussion_comments.author_user_id,
  discussion_comments.parent_comment_id,
  discussion_comments.root_comment_id,
  discussion_comments.depth,
  discussion_comments.body_html,
  discussion_comments.body_text,
  discussion_comments.status,
  discussion_comments.hidden_reason,
  discussion_comments.likes_count,
  discussion_comments.replies_count,
  discussion_comments.reports_count,
  discussion_comments.created_at,
  discussion_comments.updated_at,
  discussion_comments.edited_at,
  discussion_comments.hidden_at,
  discussion_comments.deleted_at,
  users.display_name AS author_display_name,
  users.nickname AS author_nickname,
  users.avatar_url AS author_avatar_url
`;

export class CommentsRepositoryError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CommentsRepositoryError";
    this.status = status;
  }
}

function readBoolean(value: boolean | number | null | undefined) {
  return value === true || value === 1;
}

function normalizeCommentBody(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new CommentsRepositoryError("Введите текст комментария.", 400);
  }

  const bodyHtml = buildCommentHtml(trimmedValue);

  if (!hasCommentBodyContent(bodyHtml)) {
    throw new CommentsRepositoryError("Введите текст комментария.", 400);
  }

  const bodyTextLength = getCommentContentTextLength(bodyHtml);

  if (bodyTextLength > COMMENT_BODY_MAX_LENGTH) {
    throw new CommentsRepositoryError(
      `Комментарий должен быть не длиннее ${COMMENT_BODY_MAX_LENGTH} символов.`,
      400,
    );
  }

  if (bodyHtml.length > COMMENT_BODY_HTML_MAX_LENGTH) {
    throw new CommentsRepositoryError(
      "Комментарий получился слишком тяжёлым. Попробуйте изображение меньшего размера.",
      400,
    );
  }

  return bodyHtml;
}

function normalizeReportReason(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.length > COMMENT_REPORT_REASON_MAX_LENGTH) {
    throw new CommentsRepositoryError(
      `Причина жалобы должна быть не длиннее ${COMMENT_REPORT_REASON_MAX_LENGTH} символов.`,
      400,
    );
  }

  return trimmedValue;
}

function getCommentMentionLabel(params: {
  displayName: string;
  nickname: string | null;
}) {
  return getUserHandle({
    displayName: params.displayName,
    nickname: params.nickname,
  }).replace(/^@/, "");
}

function prependCommentMention(
  bodyHtml: string,
  mentionLabel: string,
  targetCommentId?: string | null,
) {
  const trimmedLabel = mentionLabel.trim();

  if (!trimmedLabel) {
    return bodyHtml;
  }

  const mentionToken = targetCommentId
    ? `@[${trimmedLabel}|${targetCommentId}]`
    : `@[${trimmedLabel}]`;
  const escapedMention = `${escapeHtml(mentionToken)} `;

  if (bodyHtml.startsWith("<p>")) {
    return bodyHtml.replace("<p>", `<p>${escapedMention}`);
  }

  return `<p>${escapedMention}</p>${bodyHtml}`;
}

function extractCommentMentionMeta(bodyHtml: string) {
  const mentionMatch = bodyHtml.match(/@\[([^[\]|]+)(?:\|([^[\]|]+))?\]/);

  if (!mentionMatch) {
    return {
      label: null,
      targetCommentId: null,
    };
  }

  return {
    label: mentionMatch[1] ?? null,
    targetCommentId: mentionMatch[2] ?? null,
  };
}

async function queryPgRows<T extends Record<string, unknown>>(query: string, values: unknown[] = []) {
  const result = await queryAuthPostgres<T>(query, values);
  return result.rows;
}

async function queryPgOne<T extends Record<string, unknown>>(query: string, values: unknown[] = []) {
  const rows = await queryPgRows<T>(query, values);
  return rows[0] ?? null;
}

function mapCommentAuthor(params: {
  avatarUrl: string | null;
  displayName: string;
  nickname: string | null;
  userId: string;
}): CommentAuthor {
  return {
    id: params.userId,
    name: params.displayName,
    handle: getUserHandle({
      displayName: params.displayName,
      nickname: params.nickname,
    }),
    avatarUrl: params.avatarUrl,
    initials: getInitials(params.displayName),
    kind: "sso",
  };
}

function isWithinCommentEditWindow(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() <= COMMENT_EDIT_WINDOW_MS;
}

function canActorEditComment(
  actor: SessionUser | null,
  comment: {
    authorUserId: string;
    createdAt: string;
    status: CommentStatus;
  },
) {
  if (!actor || comment.status !== "published") {
    return false;
  }

  if (canModerateContent(actor)) {
    return true;
  }

  if (actor.id !== comment.authorUserId) {
    return false;
  }

  return isWithinCommentEditWindow(comment.createdAt);
}

function canActorDeleteComment(
  actor: SessionUser | null,
  comment: {
    authorUserId: string;
    status: CommentStatus;
  },
) {
  if (!actor || comment.status === "deleted") {
    return false;
  }

  return canDeleteOwnComment(actor, comment.authorUserId);
}

function buildCommentNode(params: {
  capabilities: CommentsCapabilities;
  currentUser: SessionUser | null;
  replies: CommentNode[];
  row: DiscussionCommentRow;
  depth: number;
  bodyHtml?: string;
  bodyText?: string;
}): CommentNode {
  const {
    capabilities,
    currentUser,
    replies,
    row,
    depth,
    bodyHtml = row.body_html,
    bodyText = row.body_text,
  } = params;
  const viewerOwnsComment = Boolean(currentUser && row.author_user_id === currentUser.id);
  const currentUserCanInteract = Boolean(currentUser && !currentUser.isBanned);
  const canEditComment = canActorEditComment(currentUser, {
    authorUserId: row.author_user_id,
    createdAt: row.created_at,
    status: row.status,
  });
  const canDeleteComment = canActorDeleteComment(currentUser, {
    authorUserId: row.author_user_id,
    status: row.status,
  });

  return {
    id: row.id,
    parentId: row.parent_comment_id,
    rootId: row.root_comment_id ?? row.id,
    depth,
    author: mapCommentAuthor({
      avatarUrl: row.author_avatar_url,
      displayName: row.author_display_name,
      nickname: row.author_nickname,
      userId: row.author_user_id,
    }),
    createdAt: Math.floor(new Date(row.created_at).getTime() / 1000),
    relativeDate: formatRelativeDate(Math.floor(new Date(row.created_at).getTime() / 1000)),
    compactRelativeDate: formatRelativeDateCompact(
      Math.floor(new Date(row.created_at).getTime() / 1000),
    ),
    bodyHtml,
    bodyText,
    upvotes: row.likes_count,
    downvotes: 0,
    isEdited: Boolean(row.edited_at),
    isFeatured: false,
    isLoved: false,
    userVote: readBoolean(row.viewer_liked) ? "up" : null,
    viewerOwnsComment,
    replyCount: Math.max(replies.length, row.replies_count),
    replies,
    capabilities: {
      canReply: capabilities.canReply && row.status === "published",
      canVote:
        capabilities.canVote && currentUserCanInteract && row.status === "published",
      canReport:
        capabilities.canReport && currentUserCanInteract && !viewerOwnsComment && row.status === "published",
      canEdit: canEditComment,
      canDelete: canDeleteComment,
    },
  };
}

function sortTopLevelComments(
  comments: DiscussionCommentRow[],
  sort: CommentsSortValue,
) {
  const nextComments = [...comments];

  nextComments.sort((left, right) => {
    if (sort === "top" && left.likes_count !== right.likes_count) {
      return right.likes_count - left.likes_count;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });

  return nextComments;
}

function sortReplies(comments: DiscussionCommentRow[]) {
  return [...comments].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );
}

function sortFlattenedRepliesByMentionTarget(comments: DiscussionCommentRow[]) {
  const sortedComments = sortReplies(comments);
  const commentsById = new Map(sortedComments.map((comment) => [comment.id, comment]));
  const commentsByMentionTargetId = new Map<string, DiscussionCommentRow[]>();
  const rootComments: DiscussionCommentRow[] = [];

  sortedComments.forEach((comment) => {
    const { targetCommentId } = extractCommentMentionMeta(comment.body_html);

    if (!targetCommentId || !commentsById.has(targetCommentId)) {
      rootComments.push(comment);
      return;
    }

    const currentTargetReplies = commentsByMentionTargetId.get(targetCommentId) ?? [];
    currentTargetReplies.push(comment);
    commentsByMentionTargetId.set(targetCommentId, currentTargetReplies);
  });

  const expandComment = (comment: DiscussionCommentRow): DiscussionCommentRow[] => [
    comment,
    ...(commentsByMentionTargetId.get(comment.id) ?? []).flatMap(expandComment),
  ];

  return rootComments.flatMap(expandComment);
}

function countCommentNodes(comments: CommentNode[]): number {
  return comments.reduce((total, comment) => total + 1 + countCommentNodes(comment.replies), 0);
}

function buildCommentsSection(params: {
  capabilities: CommentsCapabilities;
  currentUser: SessionUser | null;
  pageId: string;
  rows: DiscussionCommentRow[];
  sort: CommentsSortValue;
  viewer: CommentsViewer;
}): CommentsSectionData {
  const repliesByParentCommentId = new Map<string, DiscussionCommentRow[]>();

  params.rows.forEach((row) => {
    const parentId = row.parent_comment_id;

    if (!parentId) {
      return;
    }

    const currentReplies = repliesByParentCommentId.get(parentId) ?? [];
    currentReplies.push(row);
    repliesByParentCommentId.set(parentId, currentReplies);
  });

  const buildFlattenedReplies = (
    parentId: string,
    mentionTargetRow: DiscussionCommentRow,
    depth: number,
  ): CommentNode[] =>
    sortReplies(repliesByParentCommentId.get(parentId) ?? []).flatMap((replyRow) => {
      const prefixedBodyHtml = prependCommentMention(
        replyRow.body_html,
        getCommentMentionLabel({
          displayName: mentionTargetRow.author_display_name,
          nickname: mentionTargetRow.author_nickname,
        }),
        mentionTargetRow.id,
      );

      return [
        buildCommentNode({
          capabilities: params.capabilities,
          currentUser: params.currentUser,
          replies: [],
          row: replyRow,
          depth,
          bodyHtml: prefixedBodyHtml,
          bodyText: stripHtml(prefixedBodyHtml),
        }),
        ...buildFlattenedReplies(replyRow.id, replyRow, depth),
      ];
    });

  const buildRepliesTree = (parentId: string, depth: number): CommentNode[] =>
    (depth >= COMMENT_MAX_THREAD_DEPTH
      ? sortFlattenedRepliesByMentionTarget(repliesByParentCommentId.get(parentId) ?? [])
      : sortReplies(repliesByParentCommentId.get(parentId) ?? []))
      .flatMap((replyRow) => {
      if (depth >= COMMENT_MAX_THREAD_DEPTH) {
        return [
          buildCommentNode({
            capabilities: params.capabilities,
            currentUser: params.currentUser,
            replies: [],
            row: replyRow,
            depth,
          }),
          ...buildFlattenedReplies(replyRow.id, replyRow, depth),
        ];
      }

      return [
        buildCommentNode({
          capabilities: params.capabilities,
          currentUser: params.currentUser,
          replies: buildRepliesTree(replyRow.id, depth + 1),
          row: replyRow,
          depth,
        }),
      ];
      });

  const topLevelComments = sortTopLevelComments(
    params.rows.filter((row) => !row.parent_comment_id),
    params.sort,
  );

  const mappedComments = topLevelComments.map((row) => {
    return buildCommentNode({
      capabilities: params.capabilities,
      currentUser: params.currentUser,
      replies: buildRepliesTree(row.id, 1),
      row,
      depth: 0,
    });
  });

  const totalCount = countCommentNodes(mappedComments);

  return {
    pageId: params.pageId,
    totalCount,
    sort: params.sort,
    viewer: params.viewer,
    capabilities: params.capabilities,
    comments: mappedComments,
  };
}

async function findDiscussionSummaryById(discussionId: string) {
  if (isPostgresAuthEnabled()) {
    return (await queryPgOne<DiscussionSummaryRow>(
      `SELECT id, title
       FROM discussions
       WHERE id = $1
       LIMIT 1`,
      [discussionId],
    )) as DiscussionSummaryRow | null;
  }

  const row = getDatabase()
    .prepare(
      `SELECT id, title
       FROM discussions
       WHERE id = ?
       LIMIT 1`,
    )
    .get(discussionId);

  return (row as DiscussionSummaryRow | undefined) ?? null;
}

async function findDiscussionCommentBaseById(commentId: string) {
  if (isPostgresAuthEnabled()) {
    return (await queryPgOne<DiscussionCommentBaseRow>(
      `SELECT
        id,
        discussion_id,
        author_user_id,
        parent_comment_id,
        root_comment_id,
        depth,
        created_at::text AS created_at,
        status
      FROM discussion_comments
      WHERE id = $1
      LIMIT 1`,
      [commentId],
    )) as DiscussionCommentBaseRow | null;
  }

  const row = getDatabase()
    .prepare(
      `SELECT
        id,
        discussion_id,
        author_user_id,
        parent_comment_id,
        root_comment_id,
        depth,
        created_at,
        status
      FROM discussion_comments
      WHERE id = ?
      LIMIT 1`,
    )
    .get(commentId);

  return (row as DiscussionCommentBaseRow | undefined) ?? null;
}

async function findCommentAuthorMentionByUserId(userId: string) {
  if (isPostgresAuthEnabled()) {
    return (await queryPgOne<CommentAuthorMentionRow>(
      `SELECT display_name, nickname
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    )) as CommentAuthorMentionRow | null;
  }

  const row = getDatabase()
    .prepare(
      `SELECT display_name, nickname
       FROM users
       WHERE id = ?
       LIMIT 1`,
    )
    .get(userId);

  return (row as CommentAuthorMentionRow | undefined) ?? null;
}

async function listCommentAncestorChain(comment: DiscussionCommentBaseRow) {
  const chain = [comment];
  let currentComment = comment;

  while (currentComment.parent_comment_id) {
    currentComment = await assertCommentExists(currentComment.parent_comment_id);
    chain.unshift(currentComment);
  }

  return chain;
}

async function listPublishedCommentRows(discussionId: string, viewerUserId?: string | null) {
  if (isPostgresAuthEnabled()) {
    const rows = await queryPgRows<DiscussionCommentRow>(
      `SELECT
        ${PG_DISCUSSION_COMMENT_COLUMNS},
        CASE WHEN viewer_reaction.id IS NULL THEN FALSE ELSE TRUE END AS viewer_liked
      FROM discussion_comments
      INNER JOIN users ON users.id = discussion_comments.author_user_id
      LEFT JOIN discussion_comment_reactions AS viewer_reaction
        ON viewer_reaction.comment_id = discussion_comments.id
        AND viewer_reaction.user_id = $2
        AND viewer_reaction.reaction_type = 'like'
      WHERE discussion_comments.discussion_id = $1
        AND discussion_comments.status = 'published'
      ORDER BY discussion_comments.created_at ASC`,
      [discussionId, viewerUserId ?? null],
    );

    return rows as DiscussionCommentRow[];
  }

  const rows = getDatabase()
    .prepare(
      `SELECT
        ${SQLITE_DISCUSSION_COMMENT_COLUMNS},
        CASE WHEN viewer_reaction.id IS NULL THEN 0 ELSE 1 END AS viewer_liked
      FROM discussion_comments
      INNER JOIN users ON users.id = discussion_comments.author_user_id
      LEFT JOIN discussion_comment_reactions AS viewer_reaction
        ON viewer_reaction.comment_id = discussion_comments.id
        AND viewer_reaction.user_id = ?
        AND viewer_reaction.reaction_type = 'like'
      WHERE discussion_comments.discussion_id = ?
        AND discussion_comments.status = 'published'
      ORDER BY discussion_comments.created_at ASC`,
    )
    .all(viewerUserId ?? null, discussionId) as DiscussionCommentRow[];

  return rows;
}

async function syncDiscussionCommentsCount(discussionId: string) {
  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `UPDATE discussions
       SET comments_count = (
         SELECT COUNT(*)
         FROM discussion_comments
         WHERE discussion_id = $1
           AND status = 'published'
           AND (
             parent_comment_id IS NULL
             OR EXISTS (
               SELECT 1
               FROM discussion_comments AS root_comments
               WHERE root_comments.id = discussion_comments.root_comment_id
                 AND root_comments.status = 'published'
             )
           )
       )
       WHERE id = $1`,
      [discussionId],
    );
    return;
  }

  getDatabase()
    .prepare(
      `UPDATE discussions
       SET comments_count = (
         SELECT COUNT(*)
         FROM discussion_comments
         WHERE discussion_id = ?
           AND status = 'published'
           AND (
             parent_comment_id IS NULL
             OR EXISTS (
               SELECT 1
               FROM discussion_comments AS root_comments
               WHERE root_comments.id = discussion_comments.root_comment_id
                 AND root_comments.status = 'published'
             )
           )
       )
       WHERE id = ?`,
    )
    .run(discussionId, discussionId);
}

async function syncRootCommentRepliesCount(rootCommentId: string) {
  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `UPDATE discussion_comments
       SET replies_count = (
         SELECT COUNT(*)
         FROM discussion_comments AS child_comments
         WHERE child_comments.root_comment_id = $1
           AND child_comments.status = 'published'
       )
       WHERE id = $1`,
      [rootCommentId],
    );
    return;
  }

  getDatabase()
    .prepare(
      `UPDATE discussion_comments
       SET replies_count = (
         SELECT COUNT(*)
         FROM discussion_comments AS child_comments
         WHERE child_comments.root_comment_id = ?
           AND child_comments.status = 'published'
       )
       WHERE id = ?`,
    )
    .run(rootCommentId, rootCommentId);
}

async function syncCommentLikesCount(commentId: string) {
  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `UPDATE discussion_comments
       SET likes_count = (
         SELECT COUNT(*)
         FROM discussion_comment_reactions
         WHERE comment_id = $1
           AND reaction_type = 'like'
       )
       WHERE id = $1`,
      [commentId],
    );
    return;
  }

  getDatabase()
    .prepare(
      `UPDATE discussion_comments
       SET likes_count = (
         SELECT COUNT(*)
         FROM discussion_comment_reactions
         WHERE comment_id = ?
           AND reaction_type = 'like'
       )
       WHERE id = ?`,
    )
    .run(commentId, commentId);
}

async function syncCommentReportsCount(commentId: string) {
  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `UPDATE discussion_comments
       SET reports_count = (
         SELECT COUNT(*)
         FROM discussion_comment_reports
         WHERE comment_id = $1
           AND status IN ('open', 'reviewed')
       )
       WHERE id = $1`,
      [commentId],
    );
    return;
  }

  getDatabase()
    .prepare(
      `UPDATE discussion_comments
       SET reports_count = (
         SELECT COUNT(*)
         FROM discussion_comment_reports
         WHERE comment_id = ?
           AND status IN ('open', 'reviewed')
       )
       WHERE id = ?`,
    )
    .run(commentId, commentId);
}

async function assertDiscussionExists(discussionId: string) {
  const discussion = await findDiscussionSummaryById(discussionId);

  if (!discussion) {
    throw new CommentsRepositoryError("Обсуждение не найдено.", 404);
  }

  return discussion;
}

async function assertCommentExists(commentId: string) {
  const comment = await findDiscussionCommentBaseById(commentId);

  if (!comment) {
    throw new CommentsRepositoryError("Комментарий не найден.", 404);
  }

  return comment;
}

function assertCanCreateComment(actor: SessionUser | null) {
  if (!actor) {
    throw new CommentsRepositoryError(
      "Нужно войти в аккаунт, чтобы комментировать обсуждения.",
      401,
    );
  }

  if (actor.isBanned) {
    throw new CommentsRepositoryError("Комментирование для этого аккаунта недоступно.", 403);
  }
}

export async function getDiscussionCommentsSection(params: {
  capabilities: CommentsCapabilities;
  currentUser: SessionUser | null;
  discussionId: string;
  pageId: string;
  sort: CommentsSortValue;
  viewer: CommentsViewer;
}) {
  await assertDiscussionExists(params.discussionId);

  const rows = await listPublishedCommentRows(
    params.discussionId,
    params.currentUser?.id ?? null,
  );

  return buildCommentsSection({
    capabilities: params.capabilities,
    currentUser: params.currentUser,
    pageId: params.pageId,
    rows,
    sort: params.sort,
    viewer: params.viewer,
  });
}

export async function createDiscussionComment(input: CreateDiscussionCommentInput) {
  assertCanCreateComment(input.actor);
  await assertDiscussionExists(input.discussionId);

  const parentComment = input.parentId
    ? await assertCommentExists(input.parentId)
    : null;

  if (parentComment) {
    if (parentComment.discussion_id !== input.discussionId) {
      throw new CommentsRepositoryError("Нельзя ответить на комментарий из другого обсуждения.", 400);
    }

    if (parentComment.status !== "published") {
      throw new CommentsRepositoryError("Нельзя ответить на скрытый комментарий.", 409);
    }
  }

  let bodyHtml = normalizeCommentBody(input.body);
  let effectiveParentComment = parentComment;

  if (parentComment) {
    const ancestorChain = await listCommentAncestorChain(parentComment);
    const targetDepth = ancestorChain.length - 1;

    if (targetDepth >= COMMENT_MAX_THREAD_DEPTH) {
      const branchParentComment = ancestorChain[COMMENT_MAX_THREAD_DEPTH - 1] ?? parentComment;
      const mentionAuthor = await findCommentAuthorMentionByUserId(parentComment.author_user_id);

      if (mentionAuthor) {
        bodyHtml = prependCommentMention(
          bodyHtml,
          getCommentMentionLabel({
            displayName: mentionAuthor.display_name,
            nickname: mentionAuthor.nickname,
          }),
          parentComment.id,
        );
      }

      effectiveParentComment = branchParentComment;
    }
  }

  const bodyText = stripHtml(bodyHtml);

  const id = randomUUID();
  const timestamp = new Date().toISOString();
  const rootCommentId = effectiveParentComment
    ? effectiveParentComment.root_comment_id ?? effectiveParentComment.id
    : null;
  const parentCommentId = effectiveParentComment?.id ?? null;
  const commentDepth = effectiveParentComment ? 1 : 0;

  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `INSERT INTO discussion_comments (
        id,
        discussion_id,
        author_user_id,
        parent_comment_id,
        root_comment_id,
        depth,
        body_html,
        body_text,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'published', $9, $10)`,
      [
        id,
        input.discussionId,
        input.actor.id,
        parentCommentId,
        rootCommentId,
        commentDepth,
        bodyHtml,
        bodyText,
        timestamp,
        timestamp,
      ],
    );
  } else {
    getDatabase()
      .prepare(
        `INSERT INTO discussion_comments (
          id,
          discussion_id,
          author_user_id,
          parent_comment_id,
          root_comment_id,
          depth,
          body_html,
          body_text,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
      )
      .run(
        id,
        input.discussionId,
        input.actor.id,
        parentCommentId,
        rootCommentId,
        commentDepth,
        bodyHtml,
        bodyText,
        timestamp,
        timestamp,
      );
  }

  await syncDiscussionCommentsCount(input.discussionId);

  if (rootCommentId) {
    await syncRootCommentRepliesCount(rootCommentId);
  }

  return {
    commentId: id,
    moderationState: "published" as const,
  };
}

export async function setDiscussionCommentVote(params: {
  actor: SessionUser;
  commentId: string;
  type: "up" | "down" | null;
}) {
  assertCanCreateComment(params.actor);

  if (params.type === "down") {
    throw new CommentsRepositoryError("В MVP сейчас поддерживаются только лайки.", 400);
  }

  const comment = await assertCommentExists(params.commentId);

  if (comment.status !== "published") {
    throw new CommentsRepositoryError("Нельзя оценить скрытый комментарий.", 409);
  }

  if (isPostgresAuthEnabled()) {
    if (params.type === "up") {
      await execAuthPostgres(
        `INSERT INTO discussion_comment_reactions (
          id,
          comment_id,
          user_id,
          reaction_type,
          created_at
        )
        VALUES ($1, $2, $3, 'like', $4)
        ON CONFLICT (comment_id, user_id, reaction_type) DO NOTHING`,
        [randomUUID(), params.commentId, params.actor.id, new Date().toISOString()],
      );
    } else {
      await execAuthPostgres(
        `DELETE FROM discussion_comment_reactions
         WHERE comment_id = $1
           AND user_id = $2
           AND reaction_type = 'like'`,
        [params.commentId, params.actor.id],
      );
    }
  } else if (params.type === "up") {
    getDatabase()
      .prepare(
        `INSERT OR IGNORE INTO discussion_comment_reactions (
          id,
          comment_id,
          user_id,
          reaction_type,
          created_at
        )
        VALUES (?, ?, ?, 'like', ?)`,
      )
      .run(randomUUID(), params.commentId, params.actor.id, new Date().toISOString());
  } else {
    getDatabase()
      .prepare(
        `DELETE FROM discussion_comment_reactions
         WHERE comment_id = ?
           AND user_id = ?
           AND reaction_type = 'like'`,
      )
      .run(params.commentId, params.actor.id);
  }

  await syncCommentLikesCount(params.commentId);
}

export async function reportDiscussionComment(params: {
  actor: SessionUser;
  commentId: string;
  reason?: string | null;
}) {
  assertCanCreateComment(params.actor);

  const comment = await assertCommentExists(params.commentId);

  if (comment.status !== "published") {
    throw new CommentsRepositoryError("Нельзя пожаловаться на скрытый комментарий.", 409);
  }

  if (comment.author_user_id === params.actor.id) {
    throw new CommentsRepositoryError("Нельзя пожаловаться на свой комментарий.", 409);
  }

  const timestamp = new Date().toISOString();
  const normalizedReason = normalizeReportReason(params.reason);

  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `INSERT INTO discussion_comment_reports (
        id,
        comment_id,
        reporter_user_id,
        reason,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, 'open', $5, $6)
      ON CONFLICT (comment_id, reporter_user_id)
      DO UPDATE SET
        reason = EXCLUDED.reason,
        status = 'open',
        updated_at = EXCLUDED.updated_at,
        resolved_at = NULL,
        resolved_by_user_id = NULL,
        resolution_note = NULL`,
      [randomUUID(), params.commentId, params.actor.id, normalizedReason, timestamp, timestamp],
    );
  } else {
    getDatabase()
      .prepare(
        `INSERT INTO discussion_comment_reports (
          id,
          comment_id,
          reporter_user_id,
          reason,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, 'open', ?, ?)
        ON CONFLICT(comment_id, reporter_user_id)
        DO UPDATE SET
          reason = excluded.reason,
          status = 'open',
          updated_at = excluded.updated_at,
          resolved_at = NULL,
          resolved_by_user_id = NULL,
          resolution_note = NULL`,
      )
      .run(randomUUID(), params.commentId, params.actor.id, normalizedReason, timestamp, timestamp);
  }

  await syncCommentReportsCount(params.commentId);
}

export async function updateDiscussionComment(input: UpdateDiscussionCommentInput) {
  assertCanCreateComment(input.actor);

  const comment = await assertCommentExists(input.commentId);

  if (!canActorEditComment(input.actor, {
    authorUserId: comment.author_user_id,
    createdAt: comment.created_at,
    status: comment.status,
  })) {
    if (comment.status !== "published") {
      throw new CommentsRepositoryError("Редактировать можно только опубликованные комментарии.", 409);
    }

    if (canModerateContent(input.actor)) {
      throw new CommentsRepositoryError("Редактировать можно только опубликованные комментарии.", 409);
    }

    if (input.actor.id !== comment.author_user_id) {
      throw new CommentsRepositoryError("Редактировать можно только свои комментарии.", 403);
    }

    throw new CommentsRepositoryError(
      "Редактировать свой комментарий можно только в течение 15 минут после публикации.",
      409,
    );
  }

  const bodyHtml = normalizeCommentBody(input.body);
  const bodyText = stripHtml(bodyHtml);
  const timestamp = new Date().toISOString();

  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `UPDATE discussion_comments
       SET body_html = $1,
           body_text = $2,
           updated_at = $3,
           edited_at = $4
       WHERE id = $5`,
      [bodyHtml, bodyText, timestamp, timestamp, input.commentId],
    );
    return;
  }

  getDatabase()
    .prepare(
      `UPDATE discussion_comments
       SET body_html = ?,
           body_text = ?,
           updated_at = ?,
           edited_at = ?
       WHERE id = ?`,
    )
    .run(bodyHtml, bodyText, timestamp, timestamp, input.commentId);
}

export async function deleteDiscussionComment(params: {
  actor: SessionUser;
  commentId: string;
}) {
  assertCanCreateComment(params.actor);

  const comment = await assertCommentExists(params.commentId);

  if (!canDeleteOwnComment(params.actor, comment.author_user_id)) {
    throw new CommentsRepositoryError("Удалять можно только свои комментарии.", 403);
  }

  if (comment.status === "deleted") {
    return;
  }

  const timestamp = new Date().toISOString();

  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `UPDATE discussion_comments
       SET status = 'deleted',
           body_html = '',
           body_text = '',
           updated_at = $1,
           deleted_at = $2
       WHERE id = $3`,
      [timestamp, timestamp, params.commentId],
    );
  } else {
    getDatabase()
      .prepare(
        `UPDATE discussion_comments
         SET status = 'deleted',
             body_html = '',
             body_text = '',
             updated_at = ?,
             deleted_at = ?
         WHERE id = ?`,
      )
      .run(timestamp, timestamp, params.commentId);
  }

  await syncDiscussionCommentsCount(comment.discussion_id);

  if (comment.root_comment_id ?? comment.parent_comment_id) {
    await syncRootCommentRepliesCount(comment.root_comment_id ?? comment.parent_comment_id ?? "");
  }
}

export async function moderateDiscussionComment(input: ModerateDiscussionCommentInput) {
  if (!canModerateContent(input.actor)) {
    throw new CommentsRepositoryError("Недостаточно прав для модерации комментариев.", 403);
  }

  const comment = await assertCommentExists(input.commentId);
  const timestamp = new Date().toISOString();

  if (input.action === "restore") {
    if (isPostgresAuthEnabled()) {
      await execAuthPostgres(
        `UPDATE discussion_comments
         SET status = 'published',
             hidden_reason = NULL,
             hidden_at = NULL,
             deleted_at = NULL,
             updated_at = $1
         WHERE id = $2`,
        [timestamp, input.commentId],
      );
    } else {
      getDatabase()
        .prepare(
          `UPDATE discussion_comments
           SET status = 'published',
               hidden_reason = NULL,
               hidden_at = NULL,
               deleted_at = NULL,
               updated_at = ?
           WHERE id = ?`,
        )
        .run(timestamp, input.commentId);
    }
  } else if (input.action === "hide") {
    const reason = input.reason?.trim() || null;

    if (isPostgresAuthEnabled()) {
      await execAuthPostgres(
        `UPDATE discussion_comments
         SET status = 'hidden',
             hidden_reason = $1,
             hidden_at = $2,
             updated_at = $3
         WHERE id = $4`,
        [reason, timestamp, timestamp, input.commentId],
      );
    } else {
      getDatabase()
        .prepare(
          `UPDATE discussion_comments
           SET status = 'hidden',
               hidden_reason = ?,
               hidden_at = ?,
               updated_at = ?
           WHERE id = ?`,
        )
        .run(reason, timestamp, timestamp, input.commentId);
    }
  } else {
    if (isPostgresAuthEnabled()) {
      await execAuthPostgres(
        `UPDATE discussion_comments
         SET status = 'deleted',
             body_html = '',
             body_text = '',
             updated_at = $1,
             deleted_at = $2
         WHERE id = $3`,
        [timestamp, timestamp, input.commentId],
      );
    } else {
      getDatabase()
        .prepare(
          `UPDATE discussion_comments
           SET status = 'deleted',
               body_html = '',
               body_text = '',
               updated_at = ?,
               deleted_at = ?
           WHERE id = ?`,
        )
        .run(timestamp, timestamp, input.commentId);
    }
  }

  if (isPostgresAuthEnabled()) {
    await execAuthPostgres(
      `UPDATE discussion_comment_reports
       SET status = 'reviewed',
           updated_at = $1,
           resolved_at = CASE WHEN resolved_at IS NULL THEN $2 ELSE resolved_at END,
           resolved_by_user_id = CASE
             WHEN resolved_by_user_id IS NULL THEN $3
             ELSE resolved_by_user_id
           END
       WHERE comment_id = $4
         AND status = 'open'`,
      [timestamp, timestamp, input.actor.id, input.commentId],
    );
  } else {
    getDatabase()
      .prepare(
        `UPDATE discussion_comment_reports
         SET status = 'reviewed',
             updated_at = ?,
             resolved_at = CASE WHEN resolved_at IS NULL THEN ? ELSE resolved_at END,
             resolved_by_user_id = CASE
               WHEN resolved_by_user_id IS NULL THEN ?
               ELSE resolved_by_user_id
             END
         WHERE comment_id = ?
           AND status = 'open'`,
      )
      .run(timestamp, timestamp, input.actor.id, input.commentId);
  }

  await syncDiscussionCommentsCount(comment.discussion_id);
  await syncCommentReportsCount(input.commentId);

  if (comment.root_comment_id ?? comment.parent_comment_id) {
    await syncRootCommentRepliesCount(comment.root_comment_id ?? comment.parent_comment_id ?? "");
  }
}

export async function listDiscussionCommentReports() {
  if (isPostgresAuthEnabled()) {
    const rows = await queryPgRows<DiscussionCommentReportRow>(
      `SELECT
        discussion_comment_reports.id,
        discussion_comment_reports.status,
        discussion_comment_reports.reason,
        discussion_comment_reports.created_at::text AS created_at,
        discussion_comment_reports.updated_at::text AS updated_at,
        discussion_comments.id AS comment_id,
        discussion_comments.body_text AS comment_body_text,
        discussion_comments.status AS comment_status,
        discussions.id AS discussion_id,
        discussions.title AS discussion_title,
        comment_authors.id AS comment_author_id,
        comment_authors.display_name AS comment_author_display_name,
        comment_authors.nickname AS comment_author_nickname,
        comment_authors.avatar_url AS comment_author_avatar_url,
        reporters.id AS reporter_user_id,
        reporters.display_name AS reporter_display_name,
        reporters.nickname AS reporter_nickname,
        reporters.avatar_url AS reporter_avatar_url
      FROM discussion_comment_reports
      INNER JOIN discussion_comments ON discussion_comments.id = discussion_comment_reports.comment_id
      INNER JOIN discussions ON discussions.id = discussion_comments.discussion_id
      INNER JOIN users AS comment_authors ON comment_authors.id = discussion_comments.author_user_id
      INNER JOIN users AS reporters ON reporters.id = discussion_comment_reports.reporter_user_id
      ORDER BY
        CASE discussion_comment_reports.status
          WHEN 'open' THEN 0
          WHEN 'reviewed' THEN 1
          ELSE 2
        END,
        discussion_comment_reports.created_at DESC`,
    );

    return rows.map(mapDiscussionCommentReport);
  }

  const rows = getDatabase()
    .prepare(
      `SELECT
        discussion_comment_reports.id,
        discussion_comment_reports.status,
        discussion_comment_reports.reason,
        discussion_comment_reports.created_at,
        discussion_comment_reports.updated_at,
        discussion_comments.id AS comment_id,
        discussion_comments.body_text AS comment_body_text,
        discussion_comments.status AS comment_status,
        discussions.id AS discussion_id,
        discussions.title AS discussion_title,
        comment_authors.id AS comment_author_id,
        comment_authors.display_name AS comment_author_display_name,
        comment_authors.nickname AS comment_author_nickname,
        comment_authors.avatar_url AS comment_author_avatar_url,
        reporters.id AS reporter_user_id,
        reporters.display_name AS reporter_display_name,
        reporters.nickname AS reporter_nickname,
        reporters.avatar_url AS reporter_avatar_url
      FROM discussion_comment_reports
      INNER JOIN discussion_comments ON discussion_comments.id = discussion_comment_reports.comment_id
      INNER JOIN discussions ON discussions.id = discussion_comments.discussion_id
      INNER JOIN users AS comment_authors ON comment_authors.id = discussion_comments.author_user_id
      INNER JOIN users AS reporters ON reporters.id = discussion_comment_reports.reporter_user_id
      ORDER BY
        CASE discussion_comment_reports.status
          WHEN 'open' THEN 0
          WHEN 'reviewed' THEN 1
          ELSE 2
        END,
        discussion_comment_reports.created_at DESC`,
    )
    .all() as DiscussionCommentReportRow[];

  return rows.map(mapDiscussionCommentReport);
}

function mapDiscussionCommentReport(row: DiscussionCommentReportRow): AdminCommentReportItem {
  return {
    id: row.id,
    status: row.status,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    comment: {
      id: row.comment_id,
      discussionId: row.discussion_id,
      discussionTitle: row.discussion_title,
      bodyText: row.comment_body_text,
      status: row.comment_status,
      author: mapCommentAuthor({
        avatarUrl: row.comment_author_avatar_url,
        displayName: row.comment_author_display_name,
        nickname: row.comment_author_nickname,
        userId: row.comment_author_id,
      }),
    },
    reporter: mapCommentAuthor({
      avatarUrl: row.reporter_avatar_url,
      displayName: row.reporter_display_name,
      nickname: row.reporter_nickname,
      userId: row.reporter_user_id,
    }),
  };
}
