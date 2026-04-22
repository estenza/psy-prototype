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
  initials: string;
  kind: "guest" | "sso" | "hyvor";
};

export type CommentNode = {
  id: string;
  parentId: string | null;
  rootId: string;
  depth: number;
  author: CommentAuthor;
  createdAt: number;
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
    discussionId: string;
    discussionTitle: string;
    bodyText: string;
    status: "published" | "hidden" | "deleted" | "pending";
    author: CommentAuthor;
  };
  reporter: CommentAuthor;
};

export type AdminCommentReportsResponse = {
  reports: AdminCommentReportItem[];
};
