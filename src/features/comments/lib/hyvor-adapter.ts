import { formatRelativeDate, getInitials, normalizeCommentHandle, stripHtml } from "@/features/comments/lib/comment-format";
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
    initials: getInitials(comment.user.name),
    kind: userKind,
  };
}

function mapComment(
  comment: HyvorDataComment,
  replies: CommentNode[],
  capabilities: CommentsCapabilities,
  viewer: CommentsViewer,
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
    depth: comment.depth,
    author: mapAuthor(comment),
    createdAt: comment.created_at,
    relativeDate: formatRelativeDate(comment.created_at),
    bodyHtml: comment.body_html,
    bodyText: stripHtml(comment.body_html),
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
  const repliesByRootCommentId = new Map<string, HyvorDataComment[]>();

  comments.forEach((comment) => {
    if (comment.parent_ids.length === 0) {
      return;
    }

    const rootId = comment.parent_ids.at(-1)?.toString();

    if (!rootId) {
      return;
    }

    const currentReplies = repliesByRootCommentId.get(rootId) ?? [];
    currentReplies.push(comment);
    repliesByRootCommentId.set(rootId, currentReplies);
  });

  const topLevelComments = sortTopLevelComments(
    comments.filter((comment) => comment.parent_ids.length === 0),
    sort,
  );

  const mappedTopLevelComments = topLevelComments.map((comment) => {
    const mappedReplies = sortReplies(
      repliesByRootCommentId.get(comment.id.toString()) ?? [],
    ).map((replyComment) => mapComment(replyComment, [], capabilities, viewer));

    return mapComment(comment, mappedReplies, capabilities, viewer);
  });

  return {
    pageId,
    totalCount: page?.comments_count ?? comments.length,
    sort,
    viewer,
    capabilities,
    comments: mappedTopLevelComments,
  };
}
