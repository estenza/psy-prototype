import {
  escapeHtml,
  formatRelativeDate,
  formatRelativeDateCompact,
  getInitials,
  normalizeCommentHandle,
  stripHtml,
} from "@/features/comments/lib/comment-format";
import type {
  CommentAuthor,
  CommentNode,
  CommentsCapabilities,
  CommentsSectionData,
  CommentsSortValue,
  CommentsViewer,
} from "@/features/comments/types";
import type {
  HyvorDataComment,
  HyvorDataPage,
} from "@/features/comments/lib/hyvor-types";

function sortTopLevelComments(
  comments: HyvorDataComment[],
  sort: CommentsSortValue,
) {
  const sortedComments = [...comments];

  sortedComments.sort((left, right) => {
    if (sort === "top" && left.upvotes !== right.upvotes) {
      return right.upvotes - left.upvotes;
    }

    return right.created_at - left.created_at;
  });

  return sortedComments;
}

function sortReplies(comments: HyvorDataComment[]) {
  return [...comments].sort((left, right) => left.created_at - right.created_at);
}

function countCommentNodes(comments: CommentNode[]): number {
  return comments.reduce((total, comment) => total + 1 + countCommentNodes(comment.replies), 0);
}

const COMMENT_MAX_THREAD_DEPTH = 1;

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

function extractCommentMentionTargetId(bodyHtml: string) {
  const mentionMatch = bodyHtml.match(/@\[([^[\]|]+)(?:\|([^[\]|]+))?\]/);
  return mentionMatch?.[2] ?? null;
}

function sortFlattenedRepliesByMentionTarget(comments: HyvorDataComment[]) {
  const sortedComments = sortReplies(comments);
  const commentsById = new Map(sortedComments.map((comment) => [comment.id.toString(), comment]));
  const commentsByMentionTargetId = new Map<string, HyvorDataComment[]>();
  const rootComments: HyvorDataComment[] = [];

  sortedComments.forEach((comment) => {
    const targetCommentId = extractCommentMentionTargetId(comment.body_html);

    if (!targetCommentId || !commentsById.has(targetCommentId)) {
      rootComments.push(comment);
      return;
    }

    const currentTargetReplies = commentsByMentionTargetId.get(targetCommentId) ?? [];
    currentTargetReplies.push(comment);
    commentsByMentionTargetId.set(targetCommentId, currentTargetReplies);
  });

  const expandComment = (comment: HyvorDataComment): HyvorDataComment[] => [
    comment,
    ...(commentsByMentionTargetId.get(comment.id.toString()) ?? []).flatMap(expandComment),
  ];

  return rootComments.flatMap(expandComment);
}

function mapAuthor(comment: HyvorDataComment): CommentAuthor {
  const userKind = comment.user.htid?.startsWith("sso_")
    ? "sso"
    : comment.user.htid?.startsWith("hyvor_")
      ? "hyvor"
      : "guest";

  return {
    id: comment.user.htid ?? null,
    name: comment.user.name,
    handle: normalizeCommentHandle(comment.user.username, comment.user.name),
    avatarUrl: comment.user.picture_url ?? null,
    role: null,
    initials: getInitials(comment.user.name),
    kind: userKind,
  };
}

function mapComment(
  comment: HyvorDataComment,
  replies: CommentNode[],
  capabilities: CommentsCapabilities,
  viewer: CommentsViewer,
  depth: number,
  bodyHtml = comment.body_html,
): CommentNode {
  const parentId = comment.parent_ids[0]?.toString() ?? null;
  const rootId = (comment.parent_ids.at(-1) ?? comment.id).toString();
  const viewerOwnsComment = Boolean(
    viewer.hyvorUserHtid && comment.user.htid && viewer.hyvorUserHtid === comment.user.htid,
  );

  return {
    id: comment.id.toString(),
    parentId,
    rootId,
    depth,
    status: "published",
    author: mapAuthor(comment),
    createdAt: comment.created_at,
    deletedAt: null,
    deletedRelativeDate: null,
    deletedCompactRelativeDate: null,
    relativeDate: formatRelativeDate(comment.created_at),
    compactRelativeDate: formatRelativeDateCompact(comment.created_at),
    bodyHtml,
    bodyText: stripHtml(bodyHtml),
    upvotes: comment.upvotes,
    downvotes: comment.downvotes,
    isEdited: comment.is_edited,
    isFeatured: comment.is_featured,
    isLoved: comment.is_loved,
    userVote: null,
    viewerOwnsComment,
    replyCount: replies.length,
    replies,
    capabilities: {
      canReply: capabilities.canReply,
      canVote: capabilities.canVote,
      canReport: capabilities.canReport,
      canEdit: capabilities.canEditOwnComments,
      canDelete: capabilities.canDeleteOwnComments,
    },
  };
}

export function buildCommentsSectionData({
  pageId,
  page,
  comments,
  sort,
  viewer,
  capabilities,
}: {
  pageId: string;
  page: HyvorDataPage | null;
  comments: HyvorDataComment[];
  sort: CommentsSortValue;
  viewer: CommentsViewer;
  capabilities: CommentsCapabilities;
}): CommentsSectionData {
  const repliesByParentCommentId = new Map<string, HyvorDataComment[]>();

  comments.forEach((comment) => {
    const parentId = comment.parent_ids[0]?.toString();

    if (!parentId) {
      return;
    }

    const currentReplies = repliesByParentCommentId.get(parentId) ?? [];
    currentReplies.push(comment);
    repliesByParentCommentId.set(parentId, currentReplies);
  });

  const buildFlattenedReplies = (
    parentId: string,
    mentionTargetComment: HyvorDataComment,
    depth: number,
  ): CommentNode[] =>
    sortReplies(repliesByParentCommentId.get(parentId) ?? []).flatMap((replyComment) => {
      const mentionLabel = normalizeCommentHandle(
        mentionTargetComment.user.username,
        mentionTargetComment.user.name,
      ).replace(/^@/, "");
      const prefixedBodyHtml = prependCommentMention(
        replyComment.body_html,
        mentionLabel,
        mentionTargetComment.id.toString(),
      );

      return [
        mapComment(replyComment, [], capabilities, viewer, depth, prefixedBodyHtml),
        ...buildFlattenedReplies(replyComment.id.toString(), replyComment, depth),
      ];
    });

  const buildRepliesTree = (parentId: string, depth: number): CommentNode[] =>
    (depth >= COMMENT_MAX_THREAD_DEPTH
      ? sortFlattenedRepliesByMentionTarget(repliesByParentCommentId.get(parentId) ?? [])
      : sortReplies(repliesByParentCommentId.get(parentId) ?? []))
      .flatMap((replyComment) => {
      if (depth >= COMMENT_MAX_THREAD_DEPTH) {
        return [
          mapComment(replyComment, [], capabilities, viewer, depth),
          ...buildFlattenedReplies(replyComment.id.toString(), replyComment, depth),
        ];
      }

      return [
        mapComment(
          replyComment,
          buildRepliesTree(replyComment.id.toString(), depth + 1),
          capabilities,
          viewer,
          depth,
        ),
      ];
      });

  const topLevelComments = sortTopLevelComments(
    comments.filter((comment) => comment.parent_ids.length === 0),
    sort,
  );

  const mappedTopLevelComments = topLevelComments.map((comment) =>
    mapComment(comment, buildRepliesTree(comment.id.toString(), 1), capabilities, viewer, 0),
  );

  return {
    pageId,
    totalCount: page?.comments_count ?? countCommentNodes(mappedTopLevelComments),
    sort,
    viewer,
    capabilities,
    comments: mappedTopLevelComments,
  };
}
