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
  id: number;
  parentId: number | null;
  rootId: number;
  depth: number;
  author: CommentAuthor;
  createdAt: number;
  relativeDate: string;
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
  parentId?: number | null;
};

export type CreateCommentResult = {
  ok: true;
  moderationState: "published" | "pending";
};

export type CommentActionResult = {
  ok: true;
};
