export type CommentsSortValue = "top" | "newest";

export type CommentsViewer = {
  displayName: string;
  handle: string;
  initials: string;
  avatarUrl: string | null;
  hyvorUserHtid: string | null;
  kind: "guest-prototype" | "sso" | "hyvor" | "anonymous";
  isAuthenticated: boolean;
};

export type CommentsCapabilities = {
  canRead: boolean;
  canPost: boolean;
  canReply: boolean;
  canVote: boolean;
  canReport: boolean;
  canEditOwnComments: boolean;
  canDeleteOwnComments: boolean;
  authMode: "guest-prototype" | "sso" | "hyvor" | "unknown";
  editorMode: "custom-plain" | "custom-rich-html";
  postDisabledReason: string | null;
  limitations: string[];
};

export type CommentAuthor = {
  id: string | null;
  name: string;
  handle: string;
  avatarUrl: string | null;
  role: "user" | "specialist" | null;
  specialistStatus: "none" | "pending" | "verified" | "rejected" | "suspended" | null;
  initials: string;
  kind: "guest" | "sso" | "hyvor";
};

export type CommentNode = {
  id: string;
  parentId: string | null;
  rootId: string;
  depth: number;
  status: "published" | "hidden" | "deleted" | "pending";
  author: CommentAuthor;
  createdAt: number;
  deletedAt: number | null;
  deletedByModerator: boolean;
  deletedRelativeDate: string | null;
  deletedCompactRelativeDate: string | null;
  relativeDate: string;
  compactRelativeDate: string;
  bodyHtml: string;
  bodyText: string;
  upvotes: number;
  downvotes: number;
  isEdited: boolean;
  isFeatured: boolean;
  isLoved: boolean;
  userVote: "up" | "down" | null;
  viewerOwnsComment: boolean;
  replyCount: number;
  hasReplyContext: boolean;
  replies: CommentNode[];
  capabilities: {
    canReply: boolean;
    canVote: boolean;
    canReport: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
};

export type CommentsSectionData = {
  pageId: string;
  totalCount: number;
  sort: CommentsSortValue;
  viewer: CommentsViewer;
  capabilities: CommentsCapabilities;
  comments: CommentNode[];
};

export type ProfileCommentItem = {
  id: string;
  postId: string;
  postTitle: string;
  author: CommentAuthor;
  bodyHtml: string;
  bodyText: string;
  createdAt: number;
  relativeDate: string;
  compactRelativeDate: string;
  upvotes: number;
  userVote: "up" | "down" | null;
};

export type CommentsResponsePayload = {
  data: CommentsSectionData;
};

export type CreateCommentPayload = {
  pageId: string;
  body: string;
  parentId?: string | null;
};

export type CreateCommentResult = {
  ok: true;
  moderationState: "published" | "pending";
};

export type CommentActionResult = {
  ok: true;
};

export type UpdateCommentPayload = {
  body: string;
};

export type AdminModerateCommentPayload = {
  action: "hide" | "restore" | "delete";
  reason?: string | null;
};

export type AdminCommentReportItem = {
  id: string;
  status: "open" | "reviewed" | "dismissed" | "resolved";
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  comment: {
    id: string;
    postId: string;
    postTitle: string;
    bodyText: string;
    status: "published" | "hidden" | "deleted" | "pending";
    author: CommentAuthor;
  };
  reporter: CommentAuthor;
};

export type AdminCommentReportsResponse = {
  reports: AdminCommentReportItem[];
};

export type AdminCommentStatus = "deleted" | "hidden" | "pending" | "published";

export type AdminCommentsFilters = {
  search: string;
  status: AdminCommentStatus | "all";
};

export type AdminCommentTimelineItem = {
  id: string;
  postId: string;
  postTitle: string;
  parentId: string | null;
  rootId: string;
  depth: number;
  bodyText: string;
  status: AdminCommentStatus;
  hiddenReason: string | null;
  likesCount: number;
  repliesCount: number;
  reportsCount: number;
  uncheckedReportsCount: number;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  hiddenAt: string | null;
  deletedAt: string | null;
  deletedByModerator: boolean;
  author: {
    id: string;
    name: string;
    handle: string;
  };
};
