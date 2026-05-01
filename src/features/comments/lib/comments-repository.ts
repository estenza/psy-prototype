import "server-only";

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  execAuthPostgres,
  isPostgresAuthEnabled,
  queryAuthPostgres,
  type AuthPostgresTransaction,
} from "@/lib/auth-postgres";
import { getDatabase } from "@/lib/db";
import { enqueueDomainEvent } from "@/lib/domain-events/outbox";
import { runStorageUnitOfWork } from "@/lib/unit-of-work";
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
  ProfileCommentItem,
  CommentsSectionData,
  CommentsSortValue,
  CommentsViewer,
} from "@/features/comments/types";

type CommentStatus = "published" | "hidden" | "deleted" | "pending";
type CommentReportStatus = "open" | "reviewed" | "dismissed" | "resolved";

type PostSummaryRow = {
  id: string;
  title: string;
};

type ProfileCommentRow = {
  id: string;
  post_id: string;
  post_title: string;
  author_user_id: string;
  author_display_name: string;
  author_nickname: string | null;
  author_avatar_url: string | null;
  author_role: "user" | "specialist" | null;
  body_html: string;
  body_text: string;
  created_at: string;
  likes_count: number;
  viewer_liked: boolean | number | null;
};

type PostCommentRow = {
  id: string;
  post_id: string;
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
  author_role: "user" | "specialist" | null;
  viewer_liked: boolean | number | null;
};

type PostCommentBaseRow = {
  id: string;
  post_id: string;
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

type PostCommentReportRow = {
  id: string;
  status: CommentReportStatus;
  reason: string | null;
  created_at: string;
  updated_at: string;
  comment_id: string;
  comment_body_text: string;
  comment_status: CommentStatus;
  post_id: string;
  post_title: string;
  comment_author_id: string;
  comment_author_display_name: string;
  comment_author_nickname: string | null;
  comment_author_avatar_url: string | null;
  reporter_user_id: string;
  reporter_display_name: string;
  reporter_nickname: string | null;
  reporter_avatar_url: string | null;
};

type CreatePostCommentInput = {
  actor: SessionUser;
  body: string;
  postId: string;
  parentId?: string | null;
};

type UpdatePostCommentInput = {
  actor: SessionUser;
  body: string;
  commentId: string;
};

type ModeratePostCommentInput = {
  action: "hide" | "restore" | "delete";
  actor: SessionUser;
  commentId: string;
  reason?: string | null;
};

const COMMENT_BODY_MAX_LENGTH = 5000;
const COMMENT_BODY_HTML_MAX_LENGTH = 300_000;
const COMMENT_REPORT_REASON_MAX_LENGTH = 500;
const COMMENT_EDIT_WINDOW_MS = 15 * 60 * 1000;
const COMMENT_MAX_THREAD_DEPTH = 1;

const PG_DISCUSSION_COMMENT_COLUMNS = `
  post_comments.id,
  post_comments.post_id,
  post_comments.author_user_id,
  post_comments.parent_comment_id,
  post_comments.root_comment_id,
  post_comments.depth,
  post_comments.body_html,
  post_comments.body_text,
  post_comments.status,
  post_comments.hidden_reason,
  post_comments.likes_count,
  post_comments.replies_count,
  post_comments.reports_count,
  post_comments.created_at::text AS created_at,
  post_comments.updated_at::text AS updated_at,
  post_comments.edited_at::text AS edited_at,
  post_comments.hidden_at::text AS hidden_at,
  post_comments.deleted_at::text AS deleted_at,
  users.display_name AS author_display_name,
  users.nickname AS author_nickname,
  users.avatar_url AS author_avatar_url,
  users.role AS author_role
`;

const SQLITE_DISCUSSION_COMMENT_COLUMNS = `
  post_comments.id,
  post_comments.post_id,
  post_comments.author_user_id,
  post_comments.parent_comment_id,
  post_comments.root_comment_id,
  post_comments.depth,
  post_comments.body_html,
  post_comments.body_text,
  post_comments.status,
  post_comments.hidden_reason,
  post_comments.likes_count,
  post_comments.replies_count,
  post_comments.reports_count,
  post_comments.created_at,
  post_comments.updated_at,
  post_comments.edited_at,
  post_comments.hidden_at,
  post_comments.deleted_at,
  users.display_name AS author_display_name,
  users.nickname AS author_nickname,
  users.avatar_url AS author_avatar_url,
  users.role AS author_role
`;

export class CommentsRepositoryError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CommentsRepositoryError";
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
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

  const existingMentionMatch = bodyHtml.match(/@\[([^[\]|]+)(?:\|([^[\]|]+))?\]/);
  const existingMentionLabel = existingMentionMatch?.[1]?.trim() ?? null;
  const existingTargetCommentId = existingMentionMatch?.[2] ?? null;

  if (
    (targetCommentId && existingTargetCommentId === targetCommentId)
    || (!targetCommentId && existingMentionLabel === trimmedLabel)
  ) {
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

function mapProfileComment(row: ProfileCommentRow): ProfileCommentItem {
  const createdAtInSeconds = Math.floor(new Date(row.created_at).getTime() / 1000);

  return {
    id: row.id,
    postId: row.post_id,
    postTitle: row.post_title,
    author: mapCommentAuthor({
      avatarUrl: row.author_avatar_url,
      displayName: row.author_display_name,
      nickname: row.author_nickname,
      role: row.author_role,
      userId: row.author_user_id,
    }),
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    createdAt: createdAtInSeconds,
    relativeDate: formatRelativeDate(createdAtInSeconds),
    compactRelativeDate: formatRelativeDateCompact(createdAtInSeconds),
    upvotes: row.likes_count,
    userVote: readBoolean(row.viewer_liked) ? "up" : null,
  };
}

function mapCommentAuthor(params: {
  avatarUrl: string | null;
  displayName: string;
  nickname: string | null;
  role?: "user" | "specialist" | null;
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
    role: params.role ?? null,
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
  row: PostCommentRow;
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
    status: row.status,
    author: mapCommentAuthor({
      avatarUrl: row.author_avatar_url,
      displayName: row.author_display_name,
      nickname: row.author_nickname,
      role: row.author_role,
      userId: row.author_user_id,
    }),
    createdAt: Math.floor(new Date(row.created_at).getTime() / 1000),
    deletedAt: row.deleted_at ? Math.floor(new Date(row.deleted_at).getTime() / 1000) : null,
    deletedRelativeDate: row.deleted_at
      ? formatRelativeDate(Math.floor(new Date(row.deleted_at).getTime() / 1000))
      : null,
    deletedCompactRelativeDate: row.deleted_at
      ? formatRelativeDateCompact(Math.floor(new Date(row.deleted_at).getTime() / 1000))
      : null,
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
  comments: PostCommentRow[],
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

function sortReplies(comments: PostCommentRow[]) {
  return [...comments].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );
}

function sortFlattenedRepliesByMentionTarget(comments: PostCommentRow[]) {
  const sortedComments = sortReplies(comments);
  const commentsById = new Map(sortedComments.map((comment) => [comment.id, comment]));
  const commentsByMentionTargetId = new Map<string, PostCommentRow[]>();
  const rootComments: PostCommentRow[] = [];

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

  const expandComment = (comment: PostCommentRow): PostCommentRow[] => [
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
  rows: PostCommentRow[];
  sort: CommentsSortValue;
  viewer: CommentsViewer;
}): CommentsSectionData {
  const repliesByParentCommentId = new Map<string, PostCommentRow[]>();

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
    mentionTargetRow: PostCommentRow,
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

async function findPostSummaryById(postId: string) {
  if (isPostgresAuthEnabled()) {
    return (await queryPgOne<PostSummaryRow>(
      `SELECT id, title
       FROM posts
       WHERE id = $1
       LIMIT 1`,
      [postId],
    )) as PostSummaryRow | null;
  }

  const row = getDatabase()
    .prepare(
      `SELECT id, title
       FROM posts
       WHERE id = ?
       LIMIT 1`,
    )
    .get(postId);

  return (row as PostSummaryRow | undefined) ?? null;
}

export async function listPublishedCommentsByAuthorUserId(
  authorUserId: string,
  viewerUserId?: string | null,
) {
  if (isPostgresAuthEnabled()) {
    const rows = await queryPgRows<ProfileCommentRow>(
      `SELECT
        post_comments.id,
        post_comments.post_id,
        posts.title AS post_title,
        post_comments.author_user_id,
        users.display_name AS author_display_name,
        users.nickname AS author_nickname,
        users.avatar_url AS author_avatar_url,
        users.role AS author_role,
        post_comments.body_html,
        post_comments.body_text,
        post_comments.created_at::text AS created_at,
        post_comments.likes_count,
        CASE WHEN viewer_reaction.id IS NULL THEN FALSE ELSE TRUE END AS viewer_liked
      FROM post_comments
      INNER JOIN posts ON posts.id = post_comments.post_id
      INNER JOIN users ON users.id = post_comments.author_user_id
      LEFT JOIN post_comment_reactions AS viewer_reaction
        ON viewer_reaction.comment_id = post_comments.id
        AND viewer_reaction.user_id = $2
        AND viewer_reaction.reaction_type = 'like'
      WHERE post_comments.author_user_id = $1
        AND post_comments.status = 'published'
      ORDER BY post_comments.created_at DESC`,
      [authorUserId, viewerUserId ?? null],
    );

    return rows.map((row) => mapProfileComment(row));
  }

  const rows = getDatabase()
    .prepare(
      `SELECT
        post_comments.id,
        post_comments.post_id,
        posts.title AS post_title,
        post_comments.author_user_id,
        users.display_name AS author_display_name,
        users.nickname AS author_nickname,
        users.avatar_url AS author_avatar_url,
        users.role AS author_role,
        post_comments.body_html,
        post_comments.body_text,
        post_comments.created_at,
        post_comments.likes_count,
        CASE WHEN viewer_reaction.id IS NULL THEN 0 ELSE 1 END AS viewer_liked
      FROM post_comments
      INNER JOIN posts ON posts.id = post_comments.post_id
      INNER JOIN users ON users.id = post_comments.author_user_id
      LEFT JOIN post_comment_reactions AS viewer_reaction
        ON viewer_reaction.comment_id = post_comments.id
        AND viewer_reaction.user_id = ?
        AND viewer_reaction.reaction_type = 'like'
      WHERE post_comments.author_user_id = ?
        AND post_comments.status = 'published'
      ORDER BY post_comments.created_at DESC`,
    )
    .all(viewerUserId ?? null, authorUserId) as ProfileCommentRow[];

  return rows.map((row) => mapProfileComment(row));
}

async function findPostCommentBaseById(commentId: string) {
  if (isPostgresAuthEnabled()) {
    return (await queryPgOne<PostCommentBaseRow>(
      `SELECT
        id,
        post_id,
        author_user_id,
        parent_comment_id,
        root_comment_id,
        depth,
        created_at::text AS created_at,
        status
      FROM post_comments
      WHERE id = $1
      LIMIT 1`,
      [commentId],
    )) as PostCommentBaseRow | null;
  }

  const row = getDatabase()
    .prepare(
      `SELECT
        id,
        post_id,
        author_user_id,
        parent_comment_id,
        root_comment_id,
        depth,
        created_at,
        status
      FROM post_comments
      WHERE id = ?
      LIMIT 1`,
    )
    .get(commentId);

  return (row as PostCommentBaseRow | undefined) ?? null;
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

async function listCommentAncestorChain(comment: PostCommentBaseRow) {
  const chain = [comment];
  let currentComment = comment;

  while (currentComment.parent_comment_id) {
    currentComment = await assertCommentExists(currentComment.parent_comment_id);
    chain.unshift(currentComment);
  }

  return chain;
}

async function listPublishedCommentRows(postId: string, viewerUserId?: string | null) {
  if (isPostgresAuthEnabled()) {
    const rows = await queryPgRows<PostCommentRow>(
      `SELECT
        ${PG_DISCUSSION_COMMENT_COLUMNS},
        CASE WHEN viewer_reaction.id IS NULL THEN FALSE ELSE TRUE END AS viewer_liked
      FROM post_comments
      INNER JOIN users ON users.id = post_comments.author_user_id
      LEFT JOIN post_comment_reactions AS viewer_reaction
        ON viewer_reaction.comment_id = post_comments.id
        AND viewer_reaction.user_id = $2
        AND viewer_reaction.reaction_type = 'like'
      WHERE post_comments.post_id = $1
        AND post_comments.status IN ('published', 'deleted')
      ORDER BY post_comments.created_at ASC`,
      [postId, viewerUserId ?? null],
    );

    return rows as PostCommentRow[];
  }

  const rows = getDatabase()
    .prepare(
      `SELECT
        ${SQLITE_DISCUSSION_COMMENT_COLUMNS},
        CASE WHEN viewer_reaction.id IS NULL THEN 0 ELSE 1 END AS viewer_liked
      FROM post_comments
      INNER JOIN users ON users.id = post_comments.author_user_id
      LEFT JOIN post_comment_reactions AS viewer_reaction
        ON viewer_reaction.comment_id = post_comments.id
        AND viewer_reaction.user_id = ?
        AND viewer_reaction.reaction_type = 'like'
      WHERE post_comments.post_id = ?
        AND post_comments.status IN ('published', 'deleted')
      ORDER BY post_comments.created_at ASC`,
    )
    .all(viewerUserId ?? null, postId) as PostCommentRow[];

  return rows;
}

async function syncPostCommentsCount(postId: string) {
  if (isPostgresAuthEnabled()) {
    await syncPostCommentsCountInPostgres({ query: queryAuthPostgres }, postId);
    return;
  }

  syncPostCommentsCountInSqlite(getDatabase(), postId);
}

async function syncPostCommentsCountInPostgres(
  transaction: AuthPostgresTransaction,
  postId: string,
) {
  await transaction.query(
    `UPDATE posts
     SET comments_count = (
       SELECT COUNT(*)
       FROM post_comments
       WHERE post_id = $1
         AND status IN ('published', 'deleted')
         AND (
           parent_comment_id IS NULL
           OR EXISTS (
             SELECT 1
             FROM post_comments AS root_comments
             WHERE root_comments.id = post_comments.root_comment_id
               AND root_comments.status IN ('published', 'deleted')
           )
         )
     )
     WHERE id = $1`,
    [postId],
  );
}

function syncPostCommentsCountInSqlite(database: DatabaseSync, postId: string) {
  database
    .prepare(
      `UPDATE posts
       SET comments_count = (
         SELECT COUNT(*)
         FROM post_comments
         WHERE post_id = ?
           AND status IN ('published', 'deleted')
           AND (
             parent_comment_id IS NULL
             OR EXISTS (
               SELECT 1
               FROM post_comments AS root_comments
               WHERE root_comments.id = post_comments.root_comment_id
                 AND root_comments.status IN ('published', 'deleted')
             )
           )
       )
       WHERE id = ?`,
    )
    .run(postId, postId);
}

async function syncRootCommentRepliesCount(rootCommentId: string) {
  if (isPostgresAuthEnabled()) {
    await syncRootCommentRepliesCountInPostgres({ query: queryAuthPostgres }, rootCommentId);
    return;
  }

  syncRootCommentRepliesCountInSqlite(getDatabase(), rootCommentId);
}

async function syncRootCommentRepliesCountInPostgres(
  transaction: AuthPostgresTransaction,
  rootCommentId: string,
) {
  await transaction.query(
    `UPDATE post_comments
     SET replies_count = (
       SELECT COUNT(*)
       FROM post_comments AS child_comments
       WHERE child_comments.root_comment_id = $1
         AND child_comments.status IN ('published', 'deleted')
     )
     WHERE id = $1`,
    [rootCommentId],
  );
}

function syncRootCommentRepliesCountInSqlite(
  database: DatabaseSync,
  rootCommentId: string,
) {
  database
    .prepare(
      `UPDATE post_comments
       SET replies_count = (
         SELECT COUNT(*)
         FROM post_comments AS child_comments
         WHERE child_comments.root_comment_id = ?
           AND child_comments.status IN ('published', 'deleted')
       )
       WHERE id = ?`,
    )
    .run(rootCommentId, rootCommentId);
}

async function syncCommentLikesCountInPostgres(
  transaction: AuthPostgresTransaction,
  commentId: string,
) {
  await transaction.query(
    `UPDATE post_comments
     SET likes_count = (
       SELECT COUNT(*)
       FROM post_comment_reactions
       WHERE comment_id = $1
         AND reaction_type = 'like'
     )
     WHERE id = $1`,
    [commentId],
  );
}

function syncCommentLikesCountInSqlite(database: DatabaseSync, commentId: string) {
  database
    .prepare(
      `UPDATE post_comments
       SET likes_count = (
         SELECT COUNT(*)
         FROM post_comment_reactions
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
      `UPDATE post_comments
       SET reports_count = (
         SELECT COUNT(*)
         FROM post_comment_reports
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
      `UPDATE post_comments
       SET reports_count = (
         SELECT COUNT(*)
         FROM post_comment_reports
         WHERE comment_id = ?
           AND status IN ('open', 'reviewed')
       )
       WHERE id = ?`,
    )
    .run(commentId, commentId);
}

async function assertPostExists(postId: string) {
  const post = await findPostSummaryById(postId);

  if (!post) {
    throw new CommentsRepositoryError("Пост не найден.", 404);
  }

  return post;
}

async function assertCommentExists(commentId: string) {
  const comment = await findPostCommentBaseById(commentId);

  if (!comment) {
    throw new CommentsRepositoryError("Комментарий не найден.", 404);
  }

  return comment;
}

function assertCanCreateComment(actor: SessionUser | null) {
  if (!actor) {
    throw new CommentsRepositoryError(
      "Нужно войти в аккаунт, чтобы комментировать посты.",
      401,
    );
  }

  if (actor.isBanned) {
    throw new CommentsRepositoryError("Комментирование для этого аккаунта недоступно.", 403);
  }
}

export async function getPostCommentsSection(params: {
  capabilities: CommentsCapabilities;
  currentUser: SessionUser | null;
  postId: string;
  pageId: string;
  sort: CommentsSortValue;
  viewer: CommentsViewer;
}) {
  await assertPostExists(params.postId);

  const rows = await listPublishedCommentRows(
    params.postId,
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

export async function createPostComment(input: CreatePostCommentInput) {
  assertCanCreateComment(input.actor);
  await assertPostExists(input.postId);

  const parentComment = input.parentId
    ? await assertCommentExists(input.parentId)
    : null;

  if (parentComment) {
    if (parentComment.post_id !== input.postId) {
      throw new CommentsRepositoryError("Нельзя ответить на комментарий из другого поста.", 400);
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

  await runStorageUnitOfWork(async (unitOfWork) => {
    if (unitOfWork.kind === "postgres") {
      await unitOfWork.transaction.query(
        `INSERT INTO post_comments (
          id,
          post_id,
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
          input.postId,
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

      await syncPostCommentsCountInPostgres(unitOfWork.transaction, input.postId);

      if (rootCommentId) {
        await syncRootCommentRepliesCountInPostgres(unitOfWork.transaction, rootCommentId);
      }

      await enqueueDomainEvent(unitOfWork, {
        aggregateId: id,
        eventType: "comment.created",
        payload: {
          actor: input.actor,
          commentId: id,
          parentCommentId: input.parentId ?? null,
          postId: input.postId,
        },
      });
      return;
    }

    unitOfWork.database
      .prepare(
        `INSERT INTO post_comments (
            id,
            post_id,
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
          input.postId,
          input.actor.id,
          parentCommentId,
          rootCommentId,
          commentDepth,
          bodyHtml,
          bodyText,
        timestamp,
        timestamp,
      );

    syncPostCommentsCountInSqlite(unitOfWork.database, input.postId);

    if (rootCommentId) {
      syncRootCommentRepliesCountInSqlite(unitOfWork.database, rootCommentId);
    }

    await enqueueDomainEvent(unitOfWork, {
      aggregateId: id,
      eventType: "comment.created",
      payload: {
        actor: input.actor,
        commentId: id,
        parentCommentId: input.parentId ?? null,
        postId: input.postId,
      },
    });
  });

  return {
    commentId: id,
    moderationState: "published" as const,
  };
}

export async function setPostCommentVote(params: {
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

  await runStorageUnitOfWork(async (unitOfWork) => {
    if (unitOfWork.kind === "postgres") {
      if (params.type === "up") {
        await unitOfWork.transaction.query(
          `INSERT INTO post_comment_reactions (
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
        await unitOfWork.transaction.query(
          `DELETE FROM post_comment_reactions
           WHERE comment_id = $1
             AND user_id = $2
             AND reaction_type = 'like'`,
          [params.commentId, params.actor.id],
        );
      }

      await syncCommentLikesCountInPostgres(unitOfWork.transaction, params.commentId);
      return;
    }

    if (params.type === "up") {
      unitOfWork.database
        .prepare(
          `INSERT OR IGNORE INTO post_comment_reactions (
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
      unitOfWork.database
        .prepare(
          `DELETE FROM post_comment_reactions
             WHERE comment_id = ?
               AND user_id = ?
               AND reaction_type = 'like'`,
        )
        .run(params.commentId, params.actor.id);
    }

    syncCommentLikesCountInSqlite(unitOfWork.database, params.commentId);
  });
}

export async function reportPostComment(params: {
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
      `INSERT INTO post_comment_reports (
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
        `INSERT INTO post_comment_reports (
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

export async function updatePostComment(input: UpdatePostCommentInput) {
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
      `UPDATE post_comments
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
      `UPDATE post_comments
       SET body_html = ?,
           body_text = ?,
           updated_at = ?,
           edited_at = ?
       WHERE id = ?`,
    )
    .run(bodyHtml, bodyText, timestamp, timestamp, input.commentId);
}

export async function deletePostComment(params: {
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
  const rootCommentId = comment.root_comment_id ?? comment.parent_comment_id ?? null;

  await runStorageUnitOfWork(async (unitOfWork) => {
    if (unitOfWork.kind === "postgres") {
      await unitOfWork.transaction.query(
        `UPDATE post_comments
         SET status = 'deleted',
             body_html = '',
             body_text = '',
             updated_at = $1,
             deleted_at = $2
         WHERE id = $3`,
        [timestamp, timestamp, params.commentId],
      );

      await syncPostCommentsCountInPostgres(unitOfWork.transaction, comment.post_id);

      if (rootCommentId) {
        await syncRootCommentRepliesCountInPostgres(unitOfWork.transaction, rootCommentId);
      }
      return;
    }

    unitOfWork.database
      .prepare(
        `UPDATE post_comments
           SET status = 'deleted',
               body_html = '',
               body_text = '',
               updated_at = ?,
               deleted_at = ?
           WHERE id = ?`,
        )
        .run(timestamp, timestamp, params.commentId);

    syncPostCommentsCountInSqlite(unitOfWork.database, comment.post_id);

    if (rootCommentId) {
      syncRootCommentRepliesCountInSqlite(unitOfWork.database, rootCommentId);
    }
  });
}

export async function moderatePostComment(input: ModeratePostCommentInput) {
  if (!canModerateContent(input.actor)) {
    throw new CommentsRepositoryError("Недостаточно прав для модерации комментариев.", 403);
  }

  const comment = await assertCommentExists(input.commentId);
  const timestamp = new Date().toISOString();

  if (input.action === "restore") {
    if (isPostgresAuthEnabled()) {
      await execAuthPostgres(
        `UPDATE post_comments
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
          `UPDATE post_comments
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
        `UPDATE post_comments
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
          `UPDATE post_comments
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
        `UPDATE post_comments
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
          `UPDATE post_comments
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
      `UPDATE post_comment_reports
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
        `UPDATE post_comment_reports
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

  await syncPostCommentsCount(comment.post_id);
  await syncCommentReportsCount(input.commentId);

  if (comment.root_comment_id ?? comment.parent_comment_id) {
    await syncRootCommentRepliesCount(comment.root_comment_id ?? comment.parent_comment_id ?? "");
  }
}

export async function listPostCommentReports() {
  if (isPostgresAuthEnabled()) {
    const rows = await queryPgRows<PostCommentReportRow>(
      `SELECT
        post_comment_reports.id,
        post_comment_reports.status,
        post_comment_reports.reason,
        post_comment_reports.created_at::text AS created_at,
        post_comment_reports.updated_at::text AS updated_at,
        post_comments.id AS comment_id,
        post_comments.body_text AS comment_body_text,
        post_comments.status AS comment_status,
        posts.id AS post_id,
        posts.title AS post_title,
        comment_authors.id AS comment_author_id,
        comment_authors.display_name AS comment_author_display_name,
        comment_authors.nickname AS comment_author_nickname,
        comment_authors.avatar_url AS comment_author_avatar_url,
        reporters.id AS reporter_user_id,
        reporters.display_name AS reporter_display_name,
        reporters.nickname AS reporter_nickname,
        reporters.avatar_url AS reporter_avatar_url
      FROM post_comment_reports
      INNER JOIN post_comments ON post_comments.id = post_comment_reports.comment_id
      INNER JOIN posts ON posts.id = post_comments.post_id
      INNER JOIN users AS comment_authors ON comment_authors.id = post_comments.author_user_id
      INNER JOIN users AS reporters ON reporters.id = post_comment_reports.reporter_user_id
      ORDER BY
        CASE post_comment_reports.status
          WHEN 'open' THEN 0
          WHEN 'reviewed' THEN 1
          ELSE 2
        END,
        post_comment_reports.created_at DESC`,
    );

    return rows.map(mapPostCommentReport);
  }

  const rows = getDatabase()
    .prepare(
      `SELECT
        post_comment_reports.id,
        post_comment_reports.status,
        post_comment_reports.reason,
        post_comment_reports.created_at,
        post_comment_reports.updated_at,
        post_comments.id AS comment_id,
        post_comments.body_text AS comment_body_text,
        post_comments.status AS comment_status,
        posts.id AS post_id,
        posts.title AS post_title,
        comment_authors.id AS comment_author_id,
        comment_authors.display_name AS comment_author_display_name,
        comment_authors.nickname AS comment_author_nickname,
        comment_authors.avatar_url AS comment_author_avatar_url,
        reporters.id AS reporter_user_id,
        reporters.display_name AS reporter_display_name,
        reporters.nickname AS reporter_nickname,
        reporters.avatar_url AS reporter_avatar_url
      FROM post_comment_reports
      INNER JOIN post_comments ON post_comments.id = post_comment_reports.comment_id
      INNER JOIN posts ON posts.id = post_comments.post_id
      INNER JOIN users AS comment_authors ON comment_authors.id = post_comments.author_user_id
      INNER JOIN users AS reporters ON reporters.id = post_comment_reports.reporter_user_id
      ORDER BY
        CASE post_comment_reports.status
          WHEN 'open' THEN 0
          WHEN 'reviewed' THEN 1
          ELSE 2
        END,
        post_comment_reports.created_at DESC`,
    )
    .all() as PostCommentReportRow[];

  return rows.map(mapPostCommentReport);
}

function mapPostCommentReport(row: PostCommentReportRow): AdminCommentReportItem {
  return {
    id: row.id,
    status: row.status,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    comment: {
      id: row.comment_id,
      postId: row.post_id,
      postTitle: row.post_title,
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
